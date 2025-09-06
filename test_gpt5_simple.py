#!/usr/bin/env python3
"""
Test GPT-5 with very simple prompts to debug the issue
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def test_simple_prompts():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    tests = [
        "Hello",
        "What is 2+2?",
        "List 3 colors as JSON array",
        '["red", "blue", "green"]'
    ]
    
    for i, prompt in enumerate(tests, 1):
        print(f"\nTest {i}: {prompt}")
        try:
            response = client.chat.completions.create(
                model="gpt-5",
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.choices[0].message.content
            print(f"Response: {repr(content)}")
            print(f"Length: {len(content) if content else 'None'}")
            
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_simple_prompts()