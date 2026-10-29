from database import get_connection

eleicao_aberta = True


def status_eleicao():


    return eleicao_aberta


def fechar_eleicao():


    global eleicao_aberta


    eleicao_aberta = False


def abrir_eleicao():


    global eleicao_aberta


    eleicao_aberta = True


    conn = get_connection()


    cursor = conn.cursor()


    try:


        cursor.execute("DELETE FROM votos")


        conn.commit()


        return {"sucesso": True, "mensagem": "Urna zerada, nova eleição disponivel"}


    except Exception as e:


        return {"sucesso": False, "mensagem": str(e)}


    finally:


        cursor.close()


        conn.close()



def listar_candidatos():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM candidatos")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def buscar_candidato_por_numero(numero):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM candidatos WHERE numero = %s", (numero,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def registrar_voto(matricula, numero_candidato):


    global eleicao_aberta  # <-- ADICIONADO AQUI para garantir que ele lê o status global correto

    # 1. BLOQUEIO: Se a eleição estiver fechada, impede o voto
    if not eleicao_aberta:
        return {"sucesso": False, "mensagem": "A eleição já foi encerrada! Aguarde o início de uma nova votação."}
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM votos WHERE matricula = %s", (matricula,))
        voto_existente = cursor.fetchone()
        
        if voto_existente:
            return {"sucesso": False, "mensagem": "Este utilizador já votou!"}
        
        # 2. Descobre o ID do candidato através do número digitado
        cursor.execute("SELECT id FROM candidatos WHERE numero = %s", (numero_candidato,))
        candidato = cursor.fetchone()
        
        if not candidato:
            return {"sucesso": False, "mensagem": "Candidato não encontrado com este número!"}
        
        id_candidato = candidato['id']
        
        cursor.execute("INSERT INTO votos (matricula, id_candidato) VALUES (%s, %s)", (matricula, id_candidato))
        conn.commit()
        return {"sucesso": True, "mensagem": "Voto registrado com sucesso!"}
        
    except Exception as e:
        conn.rollback()
        return {"sucesso": False, "mensagem": str(e)}
    finally:
        cursor.close()
        conn.close()


def apurar_votos():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Conta os votos agrupando por candidato (incluindo os que tiveram 0 votos)
        query = """
            SELECT c.id, c.nome, c.numero, COUNT(v.id_candidato) as total_votos
            FROM candidatos c
            LEFT JOIN votos v ON c.id = v.id_candidato
            GROUP BY c.id, c.nome, c.numero
            ORDER BY total_votos DESC;
        """
        cursor.execute(query)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()        