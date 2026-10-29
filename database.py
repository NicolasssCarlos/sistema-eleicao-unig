import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="M27n2$l20260877",  
        database="sistema_votacao"
    )


