#!/usr/bin/env python3
"""
Test GPT-5 with a specific chunk from fundamentals.md
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def test_intro_chunk():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    # Just the AI definitions from the intro
    content = """
## Artificial intelligence (AI)

AI is a broad field that encompasses the development of intelligent systems capable of performing tasks that typically require human intelligence, such as perception, reasoning, learning, problem-solving, and decision-making. AI serves as an umbrella term for various techniques and approaches, including machine learning, deep learning, and generative AI, among others.

## Machine learning (ML)

ML is a type of AI for understanding and building methods that make it possible for machines to learn. These methods use data to improve computer performance on a set of tasks.

## Deep learning (DL)

Deep learning uses the concept of neurons and synapses similar to how our brain is wired. An example of a deep learning application is Amazon Rekognition, which can analyze millions of images and streaming and stored videos within seconds.

## Generative AI

Generative AI is a subset of deep learning because it can adapt models built using deep learning, but without retraining or fine tuning.

Generative AI systems are capable of generating new data based on the patterns and structures learned from training data.
"""
    
    prompt = f"""Find technical terms that have clear definitions in this course material. Focus on AI/ML concepts that are explicitly defined.

Return only the term names as a JSON array. If no definitions found, return [].

Course material:
{content}

Return format: ["term1", "term2", "term3"]"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": prompt}]
        )
        
        result = response.choices[0].message.content
        print(f"Response: {result}")
        print(f"Length: {len(result) if result else 'None'}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_intro_chunk()