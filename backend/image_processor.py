import cv2
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans
from skimage import color as skcolor
import base64
import io

class ImageProcessor:
    def __init__(self, picture_id: str, img_bytes: bytes, vlm_lineart_bytes: bytes = None):
        self.picture_id = picture_id
        self.vlm_lineart_bytes = vlm_lineart_bytes
        nparr = np.frombuffer(img_bytes, np.uint8)
        self.img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        self.img_rgb = cv2.cvtColor(self.img, cv2.COLOR_BGR2RGB)

        self.vlm_lineart_img = None
        if vlm_lineart_bytes:
            vlm_nparr = np.frombuffer(vlm_lineart_bytes, np.uint8)
            self.vlm_lineart_img = cv2.imdecode(vlm_nparr, cv2.IMREAD_COLOR)

    def _encode_image(self, img: np.ndarray) -> str:
        """将numpy图像编码为base64数据URI"""
        _, buffer = cv2.imencode('.png', img)
        b64 = base64.b64encode(buffer).decode('utf-8')
        return f'data:image/png;base64,{b64}'

    def process(self) -> dict:
        lineart = self._generate_lineart_from_original()
        mask, regions = self._segment_regions(lineart)

        lineart_b64 = self._encode_image(lineart)
        mask_b64 = self._encode_image(mask)
        colored_b64 = self._encode_image(cv2.cvtColor(self.img_rgb, cv2.COLOR_RGB2BGR))

        region_colors = self._compute_region_colors(regions, mask)
        palette, regions_with_colors = self._generate_palette_from_regions(region_colors)

        return {
            'id': self.picture_id,
            'lineartUrl': lineart_b64,
            'coloredUrl': colored_b64,
            'maskUrl': mask_b64,
            'palette': palette,
            'regions': regions_with_colors
        }

    def _generate_lineart_from_original(self) -> np.ndarray:
        """使用边缘检测从原图生成线稿"""
        gray = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)

        # 1. 双边滤波去噪同时保留边缘
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        # 2. 计算梯度幅值（Sobel算子）
        grad_x = cv2.Sobel(denoised, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(denoised, cv2.CV_64F, 0, 1, ksize=3)
        gradient = np.sqrt(grad_x**2 + grad_y**2)
        gradient = (gradient / gradient.max() * 255).astype(np.uint8)

        # 3. 使用Otsu自动阈值
        _, edges = cv2.threshold(gradient, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # 4. 形态学闭运算连接断裂的边缘
        kernel = np.ones((3, 3), np.uint8)
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

        # 5. 膨胀边缘使线条更粗（更容易形成封闭区域）
        dilated = cv2.dilate(closed, np.ones((2, 2), np.uint8), iterations=1)

        # 6. 反转：黑线白底
        lineart = 255 - dilated
        return lineart

    def _process_vlm_lineart(self) -> np.ndarray:
        """处理VLM生成的线稿，确保线条清晰以便区域分割"""
        vlm_img = self.vlm_lineart_img
        if vlm_img.shape[:2] != self.img.shape[:2]:
            vlm_img = cv2.resize(vlm_img, (self.img.shape[1], self.img.shape[0]), interpolation=cv2.INTER_AREA)

        gray = cv2.cvtColor(vlm_img, cv2.COLOR_BGR2GRAY)

        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

        kernel = np.ones((3, 3), np.uint8)
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))

        return opened

    def _segment_regions(self, lineart: np.ndarray, min_region_size: int = 100) -> tuple:
        binary = (lineart > 127).astype(np.uint8)
        num_labels, labels = cv2.connectedComponents(binary, connectivity=4)

        # 合并小区域到相邻的大区域
        labels = self._merge_small_regions(labels, num_labels, min_region_size)

        # 重新编号区域（合并后ID可能不连续）
        unique_labels = np.unique(labels)
        unique_labels = unique_labels[unique_labels > 0]  # 排除背景/边缘

        label_map = {old: new for new, old in enumerate(unique_labels, start=1)}
        label_map[0] = 0  # 保持边缘为0

        new_labels = np.zeros_like(labels)
        for old, new in label_map.items():
            new_labels[labels == old] = new

        mask_img = (new_labels % 256).astype(np.uint8)

        regions = []
        for new_id in range(1, len(unique_labels) + 1):
            pixel_count = np.sum(new_labels == new_id)
            regions.append({
                'id': int(new_id),
                'pixelCount': int(pixel_count)
            })

        return mask_img, regions

    def _merge_small_regions(self, labels: np.ndarray, num_labels: int, min_size: int) -> np.ndarray:
        """将小区域合并到相邻的最大区域（跨越边缘）"""
        labels = labels.copy()

        # 计算每个区域的像素数
        region_sizes = {}
        for i in range(1, num_labels):
            size = np.sum(labels == i)
            if size > 0:
                region_sizes[i] = size

        # 按大小排序，从最小的开始合并
        small_regions = sorted(
            [(i, size) for i, size in region_sizes.items() if size < min_size],
            key=lambda x: x[1]
        )

        for small_id, _ in small_regions:
            if region_sizes.get(small_id, 0) == 0:
                continue

            region_mask = labels == small_id

            # 使用较大的膨胀核来跨越边缘找到相邻区域
            dilated = cv2.dilate(region_mask.astype(np.uint8), np.ones((7, 7), np.uint8))
            neighbor_mask = (dilated > 0) & ~region_mask

            neighbor_ids = labels[neighbor_mask]
            neighbor_ids = neighbor_ids[(neighbor_ids > 0) & (neighbor_ids != small_id)]

            if len(neighbor_ids) == 0:
                continue

            # 选择最大的相邻区域
            unique_neighbors, counts = np.unique(neighbor_ids, return_counts=True)
            best_neighbor = unique_neighbors[np.argmax([region_sizes.get(n, 0) for n in unique_neighbors])]

            # 合并
            labels[region_mask] = best_neighbor
            region_sizes[best_neighbor] = region_sizes.get(best_neighbor, 0) + region_sizes[small_id]
            region_sizes[small_id] = 0

        return labels

    def _compute_region_colors(self, regions: list, mask: np.ndarray) -> list:
        """计算每个区域的平均颜色"""
        for region in regions:
            region_mask = mask == region['id']
            if np.any(region_mask):
                region_pixels = self.img_rgb[region_mask]
                avg_color = np.mean(region_pixels, axis=0).astype(int)
                region['avgColor'] = [int(avg_color[0]), int(avg_color[1]), int(avg_color[2])]
            else:
                region['avgColor'] = [128, 128, 128]
        return regions

    def _generate_palette_from_regions(self, regions: list, n_colors: int = 30) -> tuple:
        """通过聚类区域平均颜色生成调色板"""
        if len(regions) == 0:
            return [], []

        region_avg_colors = np.array([r['avgColor'] for r in regions], dtype=np.float64)

        region_colors_normalized = region_avg_colors / 255.0
        region_colors_lab = skcolor.rgb2lab(region_colors_normalized.reshape(1, -1, 3)).reshape(-1, 3)

        actual_n_colors = min(n_colors, len(regions))
        kmeans = KMeans(n_clusters=actual_n_colors, random_state=42, n_init=10)
        labels = kmeans.fit_predict(region_colors_lab)

        centers_lab = kmeans.cluster_centers_
        centers_rgb = skcolor.lab2rgb(centers_lab.reshape(1, -1, 3)).reshape(-1, 3) * 255

        palette = []
        for i, color in enumerate(centers_rgb):
            r, g, b = int(color[0]), int(color[1]), int(color[2])
            palette.append({
                'index': i,
                'hex': f'#{r:02x}{g:02x}{b:02x}',
                'rgb': [r, g, b]
            })

        for i, region in enumerate(regions):
            region['colorIndex'] = int(labels[i])

        return palette, regions
