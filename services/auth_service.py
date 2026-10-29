import hashlib

from database import get_connection


def cadastrar_usuarios(matricula, senha):


    conn = get_connection()


    cursor = conn.cursor()


    senha_hash = hashlib.sha256(senha.encode()).hexdigest()


    try:


        query = "INSERT INTO usuarios (matricula, senha_hash) VALUES (%s, %s)"


        cursor.execute(query, (matricula, senha_hash))


        conn.commit()


        return True


    except Exception as e:


        print(f"Erro ao cadastrar: {e}")


        conn.rollback()


        return False


    finally:


        cursor.close()


        conn.close()

def verificar_usuario(matricula, senha_digitada):


    conn = get_connection()


    cursor = conn.cursor(dictionary=True)


    query = "SELECT * FROM usuarios WHERE matricula = %s"


    cursor.execute(query, (matricula, ))


    usuario = cursor.fetchone()


    cursor.close()

    conn.close()


    if not usuario:


        return None


    hash_tentativa = hashlib.sha256(senha_digitada.encode()).hexdigest()


    if hash_tentativa == usuario['senha_hash']:


        return usuario


    return None


