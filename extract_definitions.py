#!/usr/bin/env python3
"""
Extract key definitions from AWS AI Practitioner markdown files.
This script identifies and extracts definitions while preserving original wording.
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Tuple

class DefinitionExtractor:
    def __init__(self):
        self.definition_patterns = [
            # Pattern for "X is a/an..." definitions
            r'^([A-Z][^.]*?)\s+is\s+(?:a|an)\s+([^.]+(?:\.[^.]*?)*?)\.',
            # Pattern for "X refers to..." definitions
            r'^([A-Z][^.]*?)\s+refers?\s+to\s+([^.]+(?:\.[^.]*?)*?)\.',
            # Pattern for "X involves..." definitions
            r'^([A-Z][^.]*?)\s+involves?\s+([^.]+(?:\.[^.]*?)*?)\.',
            # Pattern for "X encompasses..." definitions
            r'^([A-Z][^.]*?)\s+encompasses?\s+([^.]+(?:\.[^.]*?)*?)\.',
            # Pattern for "X means..." definitions
            r'^([A-Z][^.]*?)\s+means?\s+([^.]+(?:\.[^.]*?)*?)\.',
            # Pattern for "X uses..." definitions (for technical concepts)
            r'^([A-Z][^.]*?)\s+uses?\s+([^.]+(?:\.[^.]*?)*?)\.',
        ]
        
        # Key terms we're looking for
        self.key_terms = [
            'AI', 'Artificial intelligence', 'Machine learning', 'ML', 'Deep learning', 'DL',
            'Generative AI', 'Foundation models', 'FMs', 'Large language models', 'LLMs',
            'Neural networks', 'Computer vision', 'Natural language processing', 'NLP',
            'Supervised learning', 'Unsupervised learning', 'Reinforcement learning',
            'Tokens', 'Embeddings', 'Vectors', 'Diffusion models', 'Multimodal models',
            'GANs', 'Generative adversarial networks', 'VAEs', 'Variational autoencoders',
            'Prompt engineering', 'Fine-tuning', 'RAG', 'Retrieval-augmented generation',
            'Batch inferencing', 'Real-time inferencing', 'Labeled data', 'Unlabeled data',
            'Structured data', 'Unstructured data', 'Tabular data', 'Time-series data',
            'Text data', 'Image data', 'Forward diffusion', 'Reverse diffusion',
            'Responsible AI', 'Bias', 'Variance', 'Overfitting', 'Underfitting',
            'Cross validation', 'Regularization', 'Toxicity', 'Hallucinations',
            'Fairness', 'Explainability', 'Privacy', 'Security', 'Transparency',
            'Governance', 'Compliance', 'Algorithm accountability', 'Data governance',
            'Data lifecycle', 'Data logging', 'Data residency', 'Data monitoring',
            'Classification', 'Regression', 'Clustering', 'Dimensionality reduction',
            'Accuracy', 'Precision', 'Recall', 'F1', 'AUC-ROC', 'Mean squared error',
            'R squared', 'Confusion matrix', 'True positive', 'False positive',
            'True negative', 'False negative', 'ROUGE', 'BLEU', 'BERTScore',
            'Zero-shot prompting', 'Few-shot prompting', 'Chain-of-thought prompting',
            'Temperature', 'Top P', 'Top K', 'Maximum length', 'Stop sequences'
        ]

    def clean_text(self, text: str) -> str:
        """Clean and normalize text for processing."""
        # Remove markdown formatting
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
        text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Italic
        text = re.sub(r'`([^`]+)`', r'\1', text)        # Code
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)  # Links
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def extract_definitions_from_text(self, text: str, source_file: str) -> List[Dict]:
        """Extract definitions from text using pattern matching."""
        definitions = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line = self.clean_text(line)
            if not line or line.startswith('#'):
                continue
                
            # Try each pattern
            for pattern in self.definition_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    term = match.group(1).strip()
                    definition = match.group(2).strip()
                    
                    # Check if this is a key term we're interested in
                    if any(key_term.lower() in term.lower() for key_term in self.key_terms):
                        # Get more context if the definition seems incomplete
                        full_definition = definition
                        if len(definition) < 50 and i + 1 < len(lines):
                            next_line = self.clean_text(lines[i + 1])
                            if next_line and not next_line.startswith('#'):
                                full_definition += ' ' + next_line
                        
                        definitions.append({
                            'term': term,
                            'definition': full_definition,
                            'source_file': source_file,
                            'context': line
                        })
        
        return definitions

    def extract_section_definitions(self, text: str, source_file: str) -> List[Dict]:
        """Extract definitions from section headers and their content."""
        definitions = []
        
        # Pattern for section headers that might contain definitions
        section_pattern = r'^#+\s+([^#\n]+)$'
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            match = re.match(section_pattern, line)
            if match:
                section_title = match.group(1).strip()
                
                # Check if section title contains a key term
                if any(key_term.lower() in section_title.lower() for key_term in self.key_terms):
                    # Get the content of this section (until next header or end)
                    content_lines = []
                    j = i + 1
                    while j < len(lines) and not re.match(r'^#+\s+', lines[j]):
                        if lines[j].strip():
                            content_lines.append(lines[j])
                        j += 1
                    
                    if content_lines:
                        # Take first paragraph as definition
                        first_paragraph = []
                        for content_line in content_lines:
                            clean_line = self.clean_text(content_line)
                            if clean_line and not clean_line.startswith('**') and not clean_line.startswith('!['):
                                first_paragraph.append(clean_line)
                                # Stop at first complete sentence or paragraph
                                if clean_line.endswith('.') and len(' '.join(first_paragraph)) > 30:
                                    break
                        
                        if first_paragraph:
                            definition_text = ' '.join(first_paragraph)
                            definitions.append({
                                'term': section_title,
                                'definition': definition_text,
                                'source_file': source_file,
                                'context': f"Section: {section_title}"
                            })
        
        return definitions

    def process_file(self, file_path: str) -> List[Dict]:
        """Process a single markdown file and extract definitions."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            definitions = []
            source_file = os.path.basename(file_path)
            
            # Extract pattern-based definitions
            definitions.extend(self.extract_definitions_from_text(content, source_file))
            
            # Extract section-based definitions
            definitions.extend(self.extract_section_definitions(content, source_file))
            
            return definitions
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            return []

    def process_directory(self, data_dir: str) -> Dict[str, List[Dict]]:
        """Process all markdown files in the data directory."""
        all_definitions = {}
        
        # Define the directories and their corresponding markdown files
        directories = [
            ('fundamentals', 'fundamentals.md'),
            ('ai_usecases', 'ai_usecases.md'),
            ('responsible_ai_practices', 'responsible_ai_practices.md'),
            ('developing_ml', 'developing_ml.md'),
            ('developing_genai', 'developing_genai.md'),
            ('optimizing_fm', 'optimizing_fm.md'),
            ('security_compliance_governance', 'security.md'),
            ('prompt_engineering', 'prompt_engineering.md')
        ]
        
        for dir_name, file_name in directories:
            file_path = os.path.join(data_dir, dir_name, file_name)
            if os.path.exists(file_path):
                print(f"Processing {file_path}...")
                definitions = self.process_file(file_path)
                if definitions:
                    all_definitions[dir_name] = definitions
                    print(f"  Found {len(definitions)} definitions")
                else:
                    print(f"  No definitions found")
            else:
                print(f"  File not found: {file_path}")
        
        return all_definitions

    def save_definitions(self, definitions: Dict[str, List[Dict]], output_dir: str = "definitions"):
        """Save definitions to various formats."""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save as JSON
        json_file = os.path.join(output_dir, "definitions.json")
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(definitions, f, indent=2, ensure_ascii=False)
        print(f"Saved JSON to: {json_file}")
        
        # Save as markdown
        md_file = os.path.join(output_dir, "definitions.md")
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write("# AWS AI Practitioner - Key Definitions\n\n")
            
            for category, defs in definitions.items():
                f.write(f"## {category.replace('_', ' ').title()}\n\n")
                
                for definition in defs:
                    f.write(f"### {definition['term']}\n\n")
                    f.write(f"{definition['definition']}\n\n")
                    f.write(f"*Source: {definition['source_file']}*\n\n")
                    f.write("---\n\n")
        
        print(f"Saved Markdown to: {md_file}")
        
        # Save as plain text
        txt_file = os.path.join(output_dir, "definitions.txt")
        with open(txt_file, 'w', encoding='utf-8') as f:
            f.write("AWS AI PRACTITIONER - KEY DEFINITIONS\n")
            f.write("=" * 50 + "\n\n")
            
            for category, defs in definitions.items():
                f.write(f"{category.replace('_', ' ').upper()}\n")
                f.write("-" * 30 + "\n\n")
                
                for definition in defs:
                    f.write(f"{definition['term']}\n")
                    f.write(f"{definition['definition']}\n")
                    f.write(f"Source: {definition['source_file']}\n\n")
        
        print(f"Saved text to: {txt_file}")

def main():
    extractor = DefinitionExtractor()
    
    # Process the data directory
    data_dir = "data"
    if not os.path.exists(data_dir):
        print(f"Data directory '{data_dir}' not found!")
        return
    
    print("Extracting definitions from AWS AI Practitioner materials...")
    definitions = extractor.process_directory(data_dir)
    
    if definitions:
        print(f"\nFound definitions in {len(definitions)} files")
        total_defs = sum(len(defs) for defs in definitions.values())
        print(f"Total definitions extracted: {total_defs}")
        
        # Save definitions
        extractor.save_definitions(definitions)
        print("\nDefinition extraction complete!")
    else:
        print("No definitions found!")

if __name__ == "__main__":
    main()