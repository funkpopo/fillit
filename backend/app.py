from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import base64
import requests as http_requests
from image_processor import ImageProcessor

app = Flask(__name__)
CORS(app)


@app.route('/api/pictures', methods=['POST'])
def upload_picture():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    picture_id = str(uuid.uuid4())
    original_img_bytes = file.read()

    use_vlm = request.form.get('useVLM') == 'true'
    api_key = request.form.get('apiKey')

    vlm_lineart_bytes = None
    vlm_error = None
    if use_vlm and api_key:
        try:
            from volcenginesdkarkruntime import Ark

            img_data = base64.b64encode(original_img_bytes).decode('utf-8')
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'png'
            mime_type = 'image/png' if ext == 'png' else 'image/jpeg'
            data_uri = f'data:{mime_type};base64,{img_data}'

            client = Ark(
                base_url="https://ark.cn-beijing.volces.com/api/v3",
                api_key=api_key,
            )
            response = client.images.generate(
                model="doubao-seedream-4-5-251128",
                prompt="根据图片内容，将显著的边缘位置转换为简洁的手绘黑白线稿填色书风格。要求：1.纯白色背景(#FFFFFF) 2.使用粗黑色线条(3-4像素宽) 3.所有区域必须完全封闭，线条无断点 4.简化细节 5.去除所有阴影、渐变和纹理 6.保持主体轮廓清晰 7.适合儿童填色，区域面积不小于100平方像素",
                image=data_uri,
                response_format="url",
                watermark=False
            )

            if response.data and response.data[0].url:
                for attempt in range(3):
                    try:
                        img_response = http_requests.get(response.data[0].url, timeout=30)
                        vlm_lineart_bytes = img_response.content
                        break
                    except Exception as download_err:
                        if attempt == 2:
                            raise download_err
        except Exception as e:
            print(f"VLM processing failed: {e}")
            vlm_error = str(e)

    processor = ImageProcessor(picture_id, original_img_bytes, vlm_lineart_bytes)
    result = processor.process()
    if vlm_error:
        result['vlmError'] = vlm_error

    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
