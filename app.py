from flask import Flask, send_from_directory
from whitenoise import WhiteNoise

app = Flask(__name__)

# Serve static files from the "static" folder
app.wsgi_app = WhiteNoise(app.wsgi_app, root="static/", prefix="", autorefresh=True)

@app.route('/')
def serve_home():
    return send_from_directory("static", "index.html")

if __name__ == "__main__":
    app.run(threaded=True, port=8080)
