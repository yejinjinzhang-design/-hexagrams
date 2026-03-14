"""
Web 仪表盘：提供 JSON API 和前端页面，实时展示加密货币价格与对比。
启动: python app.py  然后访问 http://127.0.0.1:5001
"""

from flask import Flask, jsonify, request, send_from_directory
import os

from crypto_monitor import get_snapshot, DEFAULT_COIN, DEFAULT_CURRENCY

app = Flask(__name__, static_folder="static")


@app.route("/api/snapshot")
def api_snapshot():
    coin = request.args.get("coin", DEFAULT_COIN)
    currency = request.args.get("currency", DEFAULT_CURRENCY)
    s = get_snapshot(coin, currency)
    if not s:
        return jsonify({"error": "获取数据失败"}), 502
    return jsonify(s.to_dict())


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    # 使用 5001 端口，避免 5000 端口被其他程序占用
    app.run(host="127.0.0.1", port=5001, debug=False)
