import hmac
import secrets

from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for

from services.auth_service import cadastrar_usuarios, verificar_usuario


from services.vote_service import (
    apurar_votos,
    abrir_eleicao,
    buscar_candidato_por_numero,
    fechar_eleicao,
    listar_candidatos,
    registrar_voto,
    status_eleicao,
)


main_bp = Blueprint('main', __name__)


@main_bp.get("/resultado")
def resultado_page():
    return render_template("resultados.html", results_available=not status_eleicao())


@main_bp.app_context_processor
def inject_csrf_token():
    def generate_csrf_token():
        token = session.get("_csrf_token")
        if not token:
            token = secrets.token_urlsafe(32)
            session["_csrf_token"] = token
        return token

    return {"csrf_token": generate_csrf_token}


@main_bp.before_request
def validate_csrf_token():
    if request.method != "POST":
        return None

    expected_token = session.get("_csrf_token")
    submitted_token = request.headers.get("X-CSRF-Token") or request.form.get("_csrf_token")
    if not expected_token or not submitted_token or not hmac.compare_digest(expected_token, submitted_token):
        return jsonify({"erro": "Sessão expirada. Atualize a página e tente novamente."}), 400

    return None


@main_bp.get("/")
def home():
    endpoint = "main.urna" if "matricula" in session else "main.login"
    return redirect(url_for(endpoint))


@main_bp.get("/urna")
def urna():
    if "matricula" not in session:
        return redirect(url_for("main.login"))
    return render_template("urna.html", election_open=status_eleicao())


@main_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"sucesso": True})


@main_bp.route('/login', methods = ['GET', 'POST'])


def login():


    if request.method == 'POST':


        matricula = request.form.get('matricula')


        senha = request.form.get('senha')


        usuario = verificar_usuario(matricula, senha)


        if usuario:
            session.clear()
            session['matricula'] = usuario['matricula'] # Guarda o aluno na sessão!
            session['_csrf_token'] = secrets.token_urlsafe(32)
            return jsonify({"sucesso": True, "mensagem": "Login efetuado com sucesso!"}), 200
        else:
            return jsonify({"sucesso": False, "mensagem": "Matrícula ou senha incorretas"}), 401


    if "matricula" in session:
        return redirect(url_for("main.urna"))

    return render_template("login.html")


@main_bp.route('/cadastro', methods = ['GET', 'POST'])


def cadastro():


    if request.method == "POST":


        matricula = (request.form.get("matricula") or "").strip()


        senha = request.form.get("senha") or ""
        senha_confirmacao = request.form.get("confirmar_senha") or ""

        if not matricula or not senha:
            return "Preencha matrícula e senha.", 400
        if len(senha) < 8:
            return "A senha deve ter pelo menos 8 caracteres.", 400
        if senha != senha_confirmacao:
            return "As senhas não conferem.", 400


        sucesso = cadastrar_usuarios(matricula, senha)


        if sucesso:


            return redirect(url_for("main.login"))


        else:


            return "Não foi possível criar a conta. Verifique a matrícula e tente novamente.", 409


    return render_template("cadastro.html")    


@main_bp.route('/candidatos', methods=['GET'])
def get_candidatos():
    candidatos = listar_candidatos()
    return jsonify(candidatos), 200

# 2. Rota para buscar um candidato específico pelo número (ex: /candidatos/10)
@main_bp.route('/candidatos/<int:numero>', methods=['GET'])
def get_candidato_por_numero(numero):
    candidato = buscar_candidato_por_numero(numero)
    if candidato:
        return jsonify(candidato), 200
    else:
        return jsonify({"erro": "Candidato não encontrado"}), 404


@main_bp.route('/votar', methods=['POST'])
def votar():
    # 1. Garante que o utilizador está autenticado via sessão
    if 'matricula' not in session:
        return jsonify({"erro": "Utilizador não autenticado. Faça login primeiro!"}), 401
        
    matricula = session['matricula'] # Pega a matrícula automaticamente da sessão
    
    # 2. Recebe os dados enviados (pode ser JSON ou Form-data)
    dados = request.get_json() or request.form
    numero_candidato = dados.get('numero')
    
    if not numero_candidato:
        return jsonify({"erro": "O número do candidato é obrigatório"}), 400
        
    # 3. Chama o serviço para registar o voto com base no número digitado
    resultado = registrar_voto(matricula, numero_candidato)
    
    if resultado["sucesso"]:
        return jsonify(resultado), 200
    else:
        return jsonify(resultado), 400    


@main_bp.post("/encerrar-eleicao")
def encerrar_eleicao():
    if "matricula" not in session:
        return jsonify({"erro": "Faça login para encerrar a votação."}), 401

    if not status_eleicao():
        return jsonify({"sucesso": True, "mensagem": "A votação já está encerrada."}), 200

    fechar_eleicao()
    return jsonify({"sucesso": True, "mensagem": "Votação encerrada. A apuração está disponível."}), 200


@main_bp.route('/resultados', methods=['GET'])
def resultados():
    if status_eleicao():
        return jsonify({"erro": "A apuração será liberada após o encerramento da votação."}), 409

    apuracao = apurar_votos()
    return jsonify(apuracao), 200 


@main_bp.route('/abrir-eleicao', methods=['POST'])
def reset():
    resultado = abrir_eleicao()  
    return jsonify(resultado), 200
