import os
import secrets
from datetime import timedelta

from flask import Flask

from controllers.main_routes import main_bp


app = Flask(__name__)
secret_key = os.environ.get("FLASK_SECRET_KEY")

if os.environ.get("VERCEL") and not secret_key:
    raise RuntimeError("Configure FLASK_SECRET_KEY antes de publicar o aplicativo.")

app.config.update(
    SECRET_KEY=secret_key or secrets.token_urlsafe(32),
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=bool(os.environ.get("VERCEL")) or os.environ.get("FLASK_ENV") == "production",
)

app.register_blueprint(main_bp)


@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; "
        "img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'",
    )
    if app.config["SESSION_COOKIE_SECURE"]:
        response.headers.setdefault("Strict-Transport-Security", "max-age=63072000")
    if request_endpoint_is_private(response):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


def request_endpoint_is_private(response):
    return response.mimetype == "text/html" and response.status_code < 400


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
    )
