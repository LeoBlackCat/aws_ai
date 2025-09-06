#!/usr/bin/env python3
"""
List available OpenAI models
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def list_models():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    try:
        models = client.models.list()
        print("Available models:")
        for model in models.data:
            if 'gpt' in model.id.lower():
                print(f"  {model.id}")
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_models()