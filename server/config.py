import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'port': os.getenv('DB_PORT', 5432)
}

# API configuration
API_CONFIG = {
    'port': int(os.getenv('API_PORT', 5000)),
    'debug': os.getenv('DEBUG', 'True').lower() == 'true'
}