#!/usr/bin/env python3
"""
Test GPT-5 with a small sample for definition extraction
"""

import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def test_small_extraction():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    # Small test content
    test_content = """
    # AI Fundamentals
    
    Artificial intelligence (AI) is a broad field that encompasses the development of intelligent systems capable of performing tasks that typically require human intelligence.
    
    Machine learning (ML) is a type of AI for understanding and building methods that make it possible for machines to learn.
    
    Deep learning uses the concept of neurons and synapses similar to how our brain is wired.
    """
    
    prompt = f"""Extract the key technical definitions from this text. Return as JSON array of term names only.

Content: {test_content}

Return format: ["term1", "term2", "term3"]"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=200
        )
        
        content = response.choices[0].message.content
        print(f"Response: {content}")
        
        if content:
            try:
                terms = json.loads(content)
                print(f"Parsed terms: {terms}")
                return True
            except json.JSONDecodeError as e:
                print(f"JSON parsing failed: {e}")
                return False
        else:
            print("No content returned")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_small_extraction()