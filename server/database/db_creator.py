import psycopg2
from psycopg2 import pool
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DB_CONFIG

class Database:
    __connection_pool = None
    
    @staticmethod
    def initialize():
        Database.__connection_pool = pool.SimpleConnectionPool(
            1, 10,
            host=DB_CONFIG['host'],
            database=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            port=DB_CONFIG['port']
        )
    
    @staticmethod
    def get_connection():
        return Database.__connection_pool.getconn()
    
    @staticmethod
    def return_connection(connection):
        Database.__connection_pool.putconn(connection)
    
    @staticmethod
    def close_all_connections():
        Database.__connection_pool.closeall()

# Example usage function
def execute_query(query, parameters=None):
    connection = None
    cursor = None
    try:
        connection = Database.get_connection()
        cursor = connection.cursor()
        
        if parameters:
            cursor.execute(query, parameters)
        else:
            cursor.execute(query)
            
        # For SELECT queries
        if query.lower().strip().startswith('select'):
            return cursor.fetchall()
        
        connection.commit()
        return True
        
    except (Exception, psycopg2.Error) as error:
        if connection:
            connection.rollback()
        print(f"Error executing query: {error}")
        return None
        
    finally:
        if cursor:
            cursor.close()
        if connection:
            Database.return_connection(connection)