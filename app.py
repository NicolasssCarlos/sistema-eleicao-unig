from flask import Flask
from database import get_connection


from controllers.main_routes import main_bp


app = Flask(__name__)


app.config['SECRET_KEY'] = 'm27n26l20'


app.register_blueprint(main_bp)


if __name__ == '__main__':
    app.run(debug=True)