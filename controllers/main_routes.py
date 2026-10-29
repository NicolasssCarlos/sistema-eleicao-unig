from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify

from services.auth_service import cadastrar_usuarios, verificar_usuario


from services.vote_service import listar_candidatos, buscar_candidato_por_numero, registrar_voto


from services.vote_service import listar_candidatos, buscar_candidato_por_numero, registrar_voto, apurar_votos, fechar_eleicao, abrir_eleicao


main_bp = Blueprint('main', __name__)


@main_bp.route('/login', methods = ['GET', 'POST'])


def login():


    if request.method == 'POST':


        matricula = request.form.get('matricula')


        senha = request.form.get('senha')


        usuario = verificar_usuario(matricula, senha)


        if usuario:
            session['matricula'] = usuario['matricula'] # Guarda o aluno na sessão!
            return jsonify({"sucesso": True, "mensagem": "Login efetuado com sucesso!"}), 200
        else:
            return jsonify({"sucesso": False, "mensagem": "Matrícula ou senha incorretas"}), 401


    return render_template("login.html")


@main_bp.route('/cadastro', methods = ['GET', 'POST'])


def cadastro():


    if request.method == "POST":


        matricula = request.form.get("matricula")


        senha = request.form.get("senha")


        sucesso = cadastrar_usuarios(matricula, senha)


        if sucesso:


            return redirect(url_for("main.login"))


        else:


            return "Erro ao cadastrar. Esta matricula ja pode estar registrada"


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


@main_bp.route('/resultados', methods=['GET'])
def resultados():


    fechar_eleicao()


    apuracao = apurar_votos()
    return jsonify(apuracao), 200 


@main_bp.route('/abrir-eleicao', methods=['POST'])
def reset():
    resultado = abrir_eleicao()  
    return jsonify(resultado), 200