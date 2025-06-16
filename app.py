from flask import Flask
app = Flask(__name__)
@app.route('/')
def home():
    return "Behold. HTTPS over LAN. Powered by hubris."
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=443, ssl_context=("./certs/server.crt", "./certs/server.key"))
