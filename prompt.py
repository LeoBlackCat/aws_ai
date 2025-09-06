    prompt = """You are an expert in AI/ML education. Analyze the following comprehensive course material and extract the most crucial general concepts and technical definitions that students need to understand.

INSTRUCTIONS:
1. Focus on GENERAL CONCEPTS AND TECHNICAL DEFINITIONS only - ignore examples, or procedural descriptions
2. Extract terms that have clear, specific definitions in the text
3. Prioritize fundamental concepts that are essential for understanding AI/ML
4. Return ONLY the term names, not the definitions themselves
5. Aim for 15-25 most important terms
6. Return as a clean JSON array of strings

CONTENT:
{content}

Return only a JSON array like: ["term1", "term2", "term3", ...]"""