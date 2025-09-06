#!/usr/bin/env python3
"""
Validate and filter definitions using GPT-5 reasoning model
Removes non-definitions and keeps only serious technical definitions
"""

import os
import json
from typing import Dict, List
from dotenv import load_dotenv
from openai import OpenAI

class DefinitionValidator:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Initialize OpenAI client
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key or self.api_key == 'your-api-key-here':
            raise ValueError("Please set your OpenAI API key in the .env file")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = "gpt-5"  # Use GPT-5 for validation as requested
        
        # GPT-5 pricing (update as needed)
        self.pricing = {
            'input': 10.0 / 1000000,    # Estimated GPT-5 pricing
            'output': 40.0 / 1000000    # Estimated GPT-5 pricing
        }

    def load_definitions(self, json_file: str) -> Dict:
        """Load definitions from JSON file"""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise ValueError(f"Could not load definitions from {json_file}: {e}")

    def create_validation_prompt(self, definitions: List[Dict]) -> str:
        """Create prompt for validating definitions"""
        
        # Convert definitions to a clean format for analysis
        definitions_text = ""
        for i, definition in enumerate(definitions, 1):
            definitions_text += f"{i}. Term: \"{definition['term']}\"\n"
            definitions_text += f"   Definition: \"{definition['definition']}\"\n"
            definitions_text += f"   Source: {definition['section']}\n\n"
        
        prompt = f"""You are an expert technical reviewer analyzing AWS AI learning material definitions.

TASK: Review these {len(definitions)} extracted definitions and identify which ones are ACTUAL TECHNICAL DEFINITIONS vs. section headers, concepts, or non-definitions.

CRITERIA for VALID technical definitions:
- Clearly defines what something IS (uses "is", "refers to", "involves", etc.)
- Provides specific, concrete explanation of a technical term or concept
- Stands alone as a complete definition
- Is not just a section header or category name
- Is not a procedural description or benefit list

CRITERIA for INVALID (should be removed):
- Section headers without actual definitions ("Flexibility and access to models")
- Benefit lists or feature descriptions
- Procedural steps or processes
- Vague or incomplete explanations
- Marketing language or general statements

DEFINITIONS TO ANALYZE:
{definitions_text}

Return your analysis as JSON in this EXACT format:
{{
  "valid_definitions": [
    {{
      "number": 1,
      "term": "exact term name",
      "definition": "exact definition text", 
      "reason": "why this is a valid technical definition"
    }}
  ],
  "invalid_definitions": [
    {{
      "number": 2,
      "term": "exact term name",
      "reason": "why this should be removed"
    }}
  ],
  "summary": {{
    "total_analyzed": {len(definitions)},
    "valid_count": 0,
    "invalid_count": 0,
    "validation_notes": "brief summary of validation process"
  }}
}}

Be strict in your evaluation. Only keep definitions that are clear, technical, and complete."""
        
        return prompt

    def validate_definitions(self, definitions: List[Dict]) -> Dict:
        """Validate definitions using GPT-5 reasoning model"""
        
        print(f"🔍 Validating {len(definitions)} definitions using {self.model}...")
        
        prompt = self.create_validation_prompt(definitions)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert technical reviewer with deep knowledge of AI/ML terminology. You excel at distinguishing between actual definitions and non-definitions."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_completion_tokens=4000
            )
            
            # Parse response
            response_text = response.choices[0].message.content.strip()
            
            # Clean up JSON if needed
            if '```json' in response_text:
                import re
                json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                if json_match:
                    response_text = json_match.group(1).strip()
            
            validation_result = json.loads(response_text)
            
            # Calculate cost
            input_tokens = len(prompt.split()) * 1.3  # Rough estimate
            output_tokens = response.usage.completion_tokens if hasattr(response, 'usage') else len(response_text.split()) * 1.3
            cost = (input_tokens * self.pricing['input']) + (output_tokens * self.pricing['output'])
            
            print(f"💰 Validation cost: ${cost:.4f}")
            
            return validation_result
            
        except Exception as e:
            print(f"❌ Validation error: {e}")
            raise e

    def apply_validation_results(self, original_definitions: List[Dict], validation_result: Dict) -> List[Dict]:
        """Apply validation results to filter definitions"""
        
        valid_definitions = []
        
        # Create mapping of original definitions by index
        definition_map = {i+1: def_item for i, def_item in enumerate(original_definitions)}
        
        # Extract valid definitions based on validation results
        for valid_item in validation_result.get('valid_definitions', []):
            number = valid_item['number']
            if number in definition_map:
                original_def = definition_map[number]
                # Keep original structure but add validation reason
                filtered_def = original_def.copy()
                filtered_def['validation_reason'] = valid_item['reason']
                valid_definitions.append(filtered_def)
        
        return valid_definitions

    def save_validated_definitions(self, validated_definitions: List[Dict], validation_result: Dict, output_dir: str = "definitions_validated"):
        """Save validated definitions"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save filtered JSON
        json_file = os.path.join(output_dir, "definitions_validated.json")
        output_data = {
            "fundamentals": validated_definitions,
            "validation_summary": validation_result.get('summary', {}),
            "validation_metadata": {
                "model_used": self.model,
                "original_count": validation_result.get('summary', {}).get('total_analyzed', 0),
                "filtered_count": len(validated_definitions),
                "removed_count": validation_result.get('summary', {}).get('invalid_count', 0)
            }
        }
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved validated JSON to: {json_file}")
        
        # Save markdown
        md_file = os.path.join(output_dir, "definitions_validated.md")
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write("# AWS AI Practitioner - Validated Technical Definitions\n\n")
            f.write(f"*Validated using {self.model} - Only serious technical definitions included*\n\n")
            
            summary = validation_result.get('summary', {})
            f.write(f"**Validation Summary:**\n")
            f.write(f"- Original definitions: {summary.get('total_analyzed', 0)}\n")
            f.write(f"- Valid definitions: {summary.get('valid_count', 0)}\n")
            f.write(f"- Removed definitions: {summary.get('invalid_count', 0)}\n\n")
            
            f.write("---\n\n")
            
            for definition in validated_definitions:
                f.write(f"### {definition['term']}\n\n")
                f.write(f"{definition['definition']}\n\n")
                f.write(f"*Source: {definition['source_file']} - {definition['section']}*\n\n")
                if 'validation_reason' in definition:
                    f.write(f"*Validation: {definition['validation_reason']}*\n\n")
                f.write("---\n\n")
        
        print(f"💾 Saved validated Markdown to: {md_file}")
        
        # Save validation report
        report_file = os.path.join(output_dir, "validation_report.txt")
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("AWS AI Practitioner Definition Validation Report\n")
            f.write("=" * 50 + "\n\n")
            
            summary = validation_result.get('summary', {})
            f.write(f"Model Used: {self.model}\n")
            f.write(f"Total Analyzed: {summary.get('total_analyzed', 0)}\n")
            f.write(f"Valid Definitions: {summary.get('valid_count', 0)}\n")
            f.write(f"Invalid Definitions: {summary.get('invalid_count', 0)}\n")
            f.write(f"Success Rate: {(summary.get('valid_count', 0) / summary.get('total_analyzed', 1)) * 100:.1f}%\n\n")
            
            f.write("Validation Notes:\n")
            f.write(f"{summary.get('validation_notes', 'No notes provided')}\n\n")
            
            # List removed definitions
            f.write("REMOVED DEFINITIONS:\n")
            f.write("-" * 20 + "\n")
            for invalid_item in validation_result.get('invalid_definitions', []):
                f.write(f"- \"{invalid_item['term']}\": {invalid_item['reason']}\n")
        
        print(f"💾 Saved validation report to: {report_file}")

def main():
    try:
        validator = DefinitionValidator()
        
        # Load definitions
        definitions_file = "definitions_openai/definitions_openai.json"
        print(f"📖 Loading definitions from: {definitions_file}")
        
        data = validator.load_definitions(definitions_file)
        definitions = data.get('fundamentals', [])
        
        if not definitions:
            print("❌ No definitions found to validate!")
            return
        
        print(f"📊 Found {len(definitions)} definitions to validate")
        
        # Validate definitions
        validation_result = validator.validate_definitions(definitions)
        
        # Apply validation results
        validated_definitions = validator.apply_validation_results(definitions, validation_result)
        
        # Save results
        validator.save_validated_definitions(validated_definitions, validation_result)
        
        # Print summary
        summary = validation_result.get('summary', {})
        print(f"\n✅ Validation complete!")
        print(f"📊 Original: {summary.get('total_analyzed', 0)} definitions")
        print(f"✅ Valid: {summary.get('valid_count', 0)} definitions")
        print(f"❌ Removed: {summary.get('invalid_count', 0)} definitions")
        print(f"📈 Success rate: {(summary.get('valid_count', 0) / summary.get('total_analyzed', 1)) * 100:.1f}%")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()