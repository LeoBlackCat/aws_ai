#!/usr/bin/env python3
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def extract_concepts_gpt5(content):
    """Extract key concepts and technical definitions using GPT-5"""
    
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    prompt = f"""You are an expert in AI/ML education. Analyze the following comprehensive course material and extract the most crucial general concepts and technical definitions that students need to understand.

INSTRUCTIONS:
1. Focus on GENERAL CONCEPTS AND TECHNICAL DEFINITIONS only - ignore examples, or procedural descriptions
2. Extract terms that have clear, specific definitions in the text
3. Prioritize fundamental concepts that are essential for understanding AI/ML
4. Return ONLY the term names, not the definitions themselves
5. Aim for ~10 most important terms
6. Return as a clean JSON array of strings

CONTENT:
{content}

Return only a JSON array like: ["term1", "term2", "term3", ...]"""

    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        result = response.choices[0].message.content.strip()
        print(f"Raw response: '{result}'")
        
        # Try to parse as JSON
        try:
            concepts = json.loads(result)
            return concepts
        except json.JSONDecodeError:
            # If not valid JSON, try to extract array from text
            import re
            array_match = re.search(r'\[.*\]', result, re.DOTALL)
            if array_match:
                return json.loads(array_match.group())
            else:
                print(f"Could not parse response as JSON: {result}")
                return []
                
    except Exception as e:
        print(f"Error calling GPT-5: {e}")
        return []

def main():
    # Test with the Introduction section from fundamentals
    introduction_content = """# Introduction

In this course, you will learn about the foundations of machine learning (ML) and artificial intelligence (AI). You will explore the connections between AI, ML, deep learning, and the emerging field of generative artificial intelligence (generative AI), which has captured the attention of businesses and individuals alike. You will gain a solid understanding of foundational AI terms, laying the groundwork for a deeper dive into these concepts. Additionally, you will learn about a selection of Amazon Web Services (AWS) services that use AI and ML capabilities. You will gain practical insights into how these tools can be used to solve real-world problems and drive innovation across various industries.

## Welcome video

Welcome to Fundamentals of Machine Learning and Artificial Intelligence, where you will explore the world of generative AI and traditional machine learning. This technology is rapidly transforming industries and shaping the future of how we interact with machines.

Generative AI is a branch of artificial intelligence that focuses on creating new content, such as text, images, audio, or even computer code, from existing data. Unlike traditional AI or machine learning systems that analyze and interpret data, generative AI models learn patterns and relationships from vast amounts of training data and use that knowledge to generate entirely new content.

One of the most popular applications of generative AI is text generation, where models like Amazon Titan and Anthropic's Claude can produce human-like writing on virtually any topic, from creative stories to technical reports. In the field of computer vision, generative AI models like Stable Diffusion can create stunning visual images from simple text prompts.

Generative AI is also revolutionizing the field of audio and speech synthesis. AI models can now generate realistic human-like voices for virtual assistants, audiobooks, and even podcasts. In the realm of coding, generative AI models can assist developers by auto-completing code snippets or even generating entire programs based on natural language descriptions.

As with any powerful technology, generative AI also raises important responsibility considerations. Issues like bias, privacy, and responsible use of these models must be carefully addressed to ensure they are deployed in a safe and trustworthy manner.

This course will provide you with the principles and concepts behind artificial intelligence, machine learning, deep learning, and generative AI. You will also discover how AWS services can play a role in your AI journey.

To fully appreciate the capabilities and potential of generative AI, it is crucial to understand its relationship with the broader fields of AI, machine learning, and deep learning. By examining the similarities and differences between these concepts, we can gain a more comprehensive understanding of the technological landscape and the synergies that drive innovation in this rapidly evolving domain.

## Artificial intelligence (AI)

AI is a broad field that encompasses the development of intelligent systems capable of performing tasks that typically require human intelligence, such as perception, reasoning, learning, problem-solving, and decision-making. AI serves as an umbrella term for various techniques and approaches, including machine learning, deep learning, and generative AI, among others.

## Machine learning (ML)

ML is a type of AI for understanding and building methods that make it possible for machines to learn. These methods use data to improve computer performance on a set of tasks.

## Deep learning (DL)

Deep learning uses the concept of neurons and synapses similar to how our brain is wired. An example of a deep learning application is Amazon Rekognition, which can analyze millions of images and streaming and stored videos within seconds.

## Generative AI

Generative AI is a subset of deep learning because it can adapt models built using deep learning, but without retraining or fine tuning.

Generative AI systems are capable of generating new data based on the patterns and structures learned from training data."""

    print("Extracting concepts from fundamentals/fundamentals.md - Introduction section...")
    concepts = extract_concepts_gpt5(introduction_content)
    
    print("\nExtracted concepts:")
    print(json.dumps(concepts, indent=2))
    
    # Save to file
    with open('/Users/leo/dev/personal/aws_ai/extracted_concepts_test.json', 'w') as f:
        json.dump({
            "file": "fundamentals/fundamentals.md",
            "section": "Introduction", 
            "concepts": concepts
        }, f, indent=2)
    
    print(f"\nSaved {len(concepts)} concepts to extracted_concepts_test.json")

if __name__ == "__main__":
    main()