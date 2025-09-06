#!/usr/bin/env python3
"""
Test GPT-5 with simplified definition extraction
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def test_definition_extraction():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    # Simple test content with clear definitions
    content = """
AI is a broad field that encompasses the development of intelligent systems capable of performing tasks that typically require human intelligence.

ML is a type of AI for understanding and building methods that make it possible for machines to learn.

Deep learning uses the concept of neurons and synapses similar to how our brain is wired.
"""
    
    # Simplified prompt
    prompt = f"""Find technical terms that are defined in this text. Return as JSON array of just the term names.

Text: {content}

Return format: ["term1", "term2"]"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.choices[0].message.content
        print(f"Response: {content}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_definition_extraction()