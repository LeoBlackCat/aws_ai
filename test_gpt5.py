#!/usr/bin/env python3
"""
Test GPT-5 availability and parameters
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def test_gpt5():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "user", "content": "Hello, are you GPT-5?"}
            ]
        )
        print("✓ GPT-5 is working!")
        print(f"Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"✗ GPT-5 test failed: {e}")
        return False

if __name__ == "__main__":
    test_gpt5()