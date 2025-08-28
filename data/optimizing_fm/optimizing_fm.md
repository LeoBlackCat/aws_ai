# Course Overview

In this course, you will explore two techniques to improve the performance of a foundation model (FM): Retrieval Augmented Generation (RAG) and fine-tuning. You will learn about Amazon Web Services (AWS) services that help store embeddings with vector databases, and the role of agents in multi-step tasks. You will also define methods for fine-tuning an FM, learn how to prepare data for fine-tuning, and more.

## Learning objectives

In this course, you will learn how to do the following:

- Identify AWS services that help store embeddings with vector databases.
- Understand the role of agents in multi-step tasks.
- Understand approaches to evaluate FM performance.
- Determine whether an FM effectively meets business objectives.
- Define methods for fine-tuning an FM.
- Describe how to prepare data to fine-tune an FM.
- Determine whether an FM effectively meets the business objectives based on the business metric identified in the use case.

# Business case

## Introduction: AnyCompany, a telecom company

AnyCompany is a telecommunications provider offering phone and internet services. 

Typically, customers experiencing issues contact AnyCompany's support center by phone, a process that is both costly and inefficient.

To streamline support, AnyCompany is shifting toward online solutions, initially creating an FAQ section on their website to address common problems. Despite this, the volume of online support tickets remains high. To further reduce the workload on their staff and enhance customer service efficiency, AnyCompany is exploring the potential of generative artificial intelligence (AI) to develop a chatbot. The chatbot would be capable of guiding customers, answering common issues, and performing certain tasks autonomously such as ordering a new phone, upgrading the phone plan to get more 5G data, and so on.

AnyCompany has a target of decreasing the number of online tickets by 70 percent  after putting the chatbot into production. The company will also monitor the customer satisfaction score by providing a survey to their customers after solving their issues. With the addition of the chatbot, the company wishes to reach a satisfaction score of at least 4 out of 5.

![](IntroDiagram@3x.png)  
Architecture diagram of the AnyCompany support system.

## Look further into the solution

To build the chatbot, AnyCompany needs to choose a foundation model (FM). The model will need capabilities in natural language processing (NLP) and understanding, in addition to an integration with AnyCompany's backend system for automation.

AnyCompany needs to choose a large language model (LLM) because these FMs have the ability to understand and process natural language. LLMs are trained over a large amount of public data, which is great for general language understanding. However, this is not optimal to answer specific customer requests about AnyCompany's services. Therefore, AnyCompany needs a way to incorporate data and a knowledge base coming from AnyCompany to improve the accuracy of the chatbot's answers by providing it with more context. 

This additional data might come from chat logs, previously handled support tickets, or even support call recordings. The data needs to be collected, anonymized, and cleansed to be incorporated in a knowledge base that can, in turn, be used by the chatbot.  

Finally, because AnyCompany is willing to have the chatbot handle some tasks autonomously, the chatbot needs to be able to launch additional functions that can modify parameters in customers' accounts.

# Retrieval-Augmented Generation
## Introduction

In the previous lesson, the business case of AnyCompany illustrated how FMs are not enough to provide qualified outputs on their own. In this lesson, you will learn the Retrieval-Augmented Generation (RAG) approach that allows FMs to query knowledge bases to provide accurate and up-to-date answers to customer prompts.

## From dataset to vector embeddings

### Enterprise datasets

Although LLMs can generate human-like text, image, audio, and more from prompts, this capability might not meet the specific needs of enterprises. Customized enterprise applications require these models to process relevant data from enterprise datasets.

Enterprises gather vast amounts of internal data, including documents, presentations, user manuals, reports, and transaction summaries, all unfamiliar to the FM. When these models ingest and use enterprise data sources, they acquire domain-specific knowledge, enabling them to produce tailored, highly relevant outputs that meet enterprise needs.

To provide the relevant enterprise data as additional context to the language model, along with the prompt, this addition helps the model deliver more accurate outputs. Determining the right context involves searching enterprise datasets using the prompt text. Vector embeddings play a crucial role in this process.

### Vector embeddings

Embedding is the process by which text, images, and audio are given numerical representation in a vector space. Embedding is usually performed by a machine learning (ML) model. The following diagram provides more details about embedding. 

![](vector@3x.png)  
Enterprise datasets, such as documents, images and audio, are passed to ML models as tokens and are vectorized. These vectors in an n-dimensional space, along with the metadata about them, are stored in purpose-built vector databases for faster retrieval.

You will now take a closer look at the embedding step.

Two words that relate to each other will have similar embeddings.

Here is an example of two words: sea and ocean. They are randomly initialized and their early embeddings are diverse. As the training progresses, their embeddings become more similar because they often appear close to each other and in similar context. For the purpose of this example, embeddings that are close together are represented by colors in the same palette. Therefore, the word sea and ocean use similar colors. However, stapler has a completely different embedding, so it uses a separate set of colors. 

![](WordChart_NOPROCESS_.png)  
Words that relate to each other will have closer embeddings.

## Storing vectors

The core function of vector databases is to compactly store billions of high-dimensional vectors representing words and entities. Vector databases provide ultra-fast similarity searches across these billions of vectors in real time. 

The most common algorithms used to perform the similarity search are k-nearest neighbors (k-NN) or cosine similarity.

Amazon Web Services (AWS) offers the following viable vector database options:

Amazon OpenSearch Service (provisioned)
Amazon OpenSearch Serverless
pgvector extension in Amazon Relational Database Service (Amazon RDS) for PostgreSQL
pgvector extension in Amazon Aurora PostgreSQL-Compatible Edition
Amazon Kendra

## RAG in the context of AnyCompany's business case

Following is an updated version of AnyCompany's architecture diagram, including the RAG system. The chatbot is now able to query a database containing enterprise data and use it to provide more accurate and contextual answers to users.

![](RAGDiagram@3x.png)  
Architecture diagram of AnyCompany's system, including a RAG approach for optimizing the model's performances.

# Agents
## Introduction

In this lesson, using the AnyCompany business case as an example, we illustrate the use of agents to meet business requirements.

## Key functions of agents

Agents can serve different roles in a generative AI application, such as the following:

- **Intermediary operations**: Agents can act as intermediaries, facilitating communication between the generative AI model and various backend systems. The generative AI model handles language understanding and response generation. The various backend systems include items such as databases, CRM platforms, or service management tools.
- **Actions launch**: Agents can be used to run a wide variety of tasks. These tasks might include adjusting service settings, processing transactions, retrieving documents, and more. These actions are based on the users' specific needs understood by the generative AI model.
- **Feedback integration**: Agents can also contribute to the AI system's learning process by collecting data on the outcomes of their actions. This feedback helps refine the AI model, enhancing its accuracy and effectiveness in future interactions.

## AnyCompany: The use of agents

AnyCompany is a telecom company using the power of generative AI to reduce the amount of tickets to be handled by their employees. To automatize the maximum number of tasks, AnyCompany need to combine agents with their generative AI model.

Following is a more detailed view of AnyCompany's architecture using agents. In this diagram, Agent 1 is used to take actions on customers' plans, based on their prompts. Agent 2 uses the conversation between the user and the chatbot to update or add more data to the enterprise data database. In turn, that refined data can be used in the RAG system to provide more appropriate answers later. Agent 3 is used to send a satisfaction survey to the user when the conversation ends. This will help AnyCompany monitor the satisfaction score and ensure that they meet their goal to improve this satisfaction score.

![](agentsdiagram@3x.png)  
AnyCompany's architecture diagram including three agents.

# Evaluate results

## Introduction

Evaluating the performance of generative AI models is critical for understanding their effectiveness and ensuring they meet indented objectives. Two of the most common evaluation methods are human evaluation and the use of benchmark datasets. Each method provides unique insights and is suitable for different aspects of model performance assessment.

## Human evaluation

Human evaluation involves real users interacting with the AI model to provide feedback based on their experience. This method is particularly valuable for assessing qualitative aspects of the model, such as the following:

**User experience**: How intuitive and satisfying is the interaction with the model from the user's perspective?
**Contextual approriateness**: Does the model respond in a way that is contextually relevant and sensitive to the nuances of human communication?
**Creativity and flexibility**: How well does the model handle unexpected queries or complex scenarios that require a nuanced understanding?
Human evaluation is often used for iterative improvements and tuning the model to better meet user expectations.

## Benchmark datasets

Benchmark datasets, on the other hand, provide a quantitative way to evaluate generative AI models. These datasets consist of predefined datasets and associated metrics that offer a consistent, objective means to measure model performances. This might include the following:

**Accuracy**: How accurately does the model perform specific tasks according to predefined standards?
**Speed and efficiency**: How quickly does the mode generate responses and how does this impact operational efficiency?
**Scalability**: Can the mode maintain its performance as the scale of data or number of users increases?
Benchmark datasets are particularly useful for initial testing phases to ensure that the model meets certain technical specifications before it is put through more subjective human evaluations. They are also essential for comparing performance across different models or different iterations of the same model.

>#### Creating a benchmark dataset
>
>The creation of a benchmark dataset is key to evaluate a RAG system. Following are the steps involving the creation of a benchmark dataset.

>#### 1. Create relevant questions
>
>First, subject matter experts (SMEs) create relevant and challenging questions related to the topic of interest or specific documents.

>#### 2. Context identification
>![](context.png)
>
>SMEs identify pertinent sections of the documents that provide context necessary for generating answers.

>#### 3. Answer drafting
>![](answer.png)
>
>SMEs draft precise answers, which become the benchmark for evaluating the RAG system's responses.

>#### Summary
>Creating a benchmark dataset is a manual process that is necessary to properly evaluate LLM performances using RAG systems.

The evaluation of LLM performance using a benchmark dataset can be automated using an LLM as a judge approach.

![](evaluate2@3x.png)

>#### 1. Questions
>
>A list of questions is used to create a benchmark dataset. The same list of questions is then provided to the model for performance evaluation.

>#### 2. Benchmark dataset
>
>The benchmark dataset contains both the answers and context provided by the SMEs.

>#### 3. Generated answers
>
>Based on the question list, the model generates answers.

>#### 4. The judge model
>
>The judge model is an external model that is used to compare the answers from the SMEs available in the benchmark dataset against the answers generated by the model to evaluate.

>#### 5. Grading score
>
>The judge model calculates a grading score to assess the performance of the model. This score should take in to account metrics such as accuracy (correctness of the response), relevance (suitability of the response to the question), and comprehensiveness (depth and breadth of the response).

## Combined approach

In practice, a combination of both human evaluation and benchmark datasets is often used to provide a comprehensive overview of a model's performance. Although benchmark datasets can quantify the model's technical capabilities, human evaluation brings an essential human-centric perspective that benchmarks cannot capture alone. This combined approach ensures that the model is not only technically proficient but also effective and engaging in real-world scenarios.

## AnyCompany business case

Review AnyCompany's business case. Before deploying the chatbot model into production, the company can evaluate the model's performances against benchmark datasets. After the model is in production, a real human will interact with the model and can rate their interaction. This helps the model to improve its accuracy as a function of time.

![](evaluatediagram@3x.png)  
AnyCompany architecture diagram with a human rating the interaction with the model.

# Knowledge Check
Test your skills

## Question 1

Which AWS service can help store embeddings within vector databases? 

- Amazon S3
- Amazon DynamoDB
- Amazon OpenSearch Service
- Amazon Kinesis Data Streams

The correct answer is Amazon OpenSearch Service.

Amazon OpenSearch Service is a fully managed service that makes it convenient to deploy, operate, and scale OpenSearch clusters in the AWS Cloud. OpenSearch supports vector data types, which allows it to store and query embeddings efficiently. Other services mentioned, such as Amazon S3, DynamoDB, and Kinesis Data Streams, are not optimized for storing and querying vector data like embeddings.

## Question 2

What is an example of a multi-step task that an agent can perform? 

- Performing a basic mathematical calculation 
- Converting a text file to PDF format
- Doing a math calculation and converting the answer into a JSON format
- Sending an email notification

The correct answer is Doing a math calculation and converting the answer into a JSON format.

Agents in the context of multi-step tasks are designed to handle complex, multi-step workflows. Doing a math calculation and converting the answer into a JSON format involves two distinct steps. It performs a mathematical calculation, then transforms the result into a specific data format (JSON). This showcases the agent's ability to handle multiple tasks in a sequential manner.

## Question 3

You are part of a research team tasked with evaluating the performance of a new language model on various natural language processing tasks.

Which approach is most suitable for evaluating the performance of a foundation model in this situation? 

- Human evaluation
- Benchmark dataset
- Both human evaluation and benchmark datasets
- Retrieval-Augmented Generation (RAG)

The correct answer is both human evaluation and benchmark datasets.

Both human evaluation and benchmark datasets are valid approaches for evaluating the performance of a foundation model. Human evaluation involves subjective assessment by humans, while benchmark datasets provide objective, quantitative measures of performance.

# Business case

## AnyCompany: A fashion retailer

AnyCompany, a trendy online fashion retailer, faces challenges with high cart abandonment rates and low repeat purchases. Customers often feel overwhelmed by the vast options and find it difficult to determine which products suit their personal style and needs. 

AnyCompany  aims to personalize the shopping experience more effectively, increasing user engagement, reducing cart abandonment, and boosting repeat purchases.

AnyCompany is willing to use the power of generative AI to achieve these goals. Specifically, they will monitor the following metrics:

**Conversion rate**: Increase in successful purchases for each site visit
**Average order value**: Increase in the dollar amount spent for each transaction
**Customer retention rate**: Increase in the percentage of returning customers

## The solution

AnyCompany will use an LLM that will have several functions. It will generate dynamic product descriptions, offer personalized shopping advice, and improve automated interactions. The solution will include the following:

**Utilization of specific datasets**: Fine-tuning on transactional data, customer feedback, and user interaction data (likes, clicks, past purchases).
**Integration with recommendation engine**: The AI model will adapt product displays and promotions to fit individual customer profiles in real time.
**Continuous learning**: Adjust the model periodically, based on new customer data and evolving fashion trends, optimizing recommendation accuracy without manual intervention.

![](feedbackloop@3x.png)

>#### 1. Data ingestion
>
>This step captures detailed user interaction, data, and customer feedback. This will help understand how users engage with existing product descriptions and their responses or comments about product features. User feedback is also analyzed to identify language or trends that resonate with customer preferences.

>#### 2. Model outputs
>
>The generative AI model generates dynamic product descriptions that are based on customer preferences, habits, and more.
>
>The products displayed for a given customer will be also dynamically modified.

>#### 3. Feedback loop
>
>A feedback loop uses customer feedback and interactions to further refine the model's performance.

# Fine-Tuning
## Introduction

Although foundation models are highly versatile, they often require fine-tuning to tailor their broad capabilities to specific applications or to enhance their performance in particular domains. Fine-tuning is critical because it helps to do the following:

- Increase specificity: Adapt the model’s responses or predictions to the nuances of a specific domain or task that were not adequately covered in the initial training.
- Improve accuracy: Enhance the model's performance on specialized tasks by training on domain-specific data, thereby reducing errors that occur due to the generic nature of foundational training.
- Reduce biases: Address and mitigate any biases inherent in the initial training data, making the model more fair and appropriate for different applications.
- Boost efficiency: Streamline the model’s operations within specific contexts, potentially reducing computational requirements and speeding up response times.
In the next section, you will look further into the different ways to fine-tune a foundation model.

## The different fine-tuning approaches

- **Instruction tuning**: This approach involves retraining the model on a new dataset that consists of prompts followed by the desired outputs. This is structured in a way that the model learns to follow specific instructions better. This method is particularly useful for improving the model's ability to understand and execute user commands accurately, making it highly effective for interactive applications like virtual assistants and chatbots. 
- **Reinforcement learning from human feedback (RLHF)**: This approach is a fine-tuning technique where the model is initially trained using supervised learning to predict human-like responses. Then, it is further refined through a reinforcement learning process, where a reward model built from human feedback guides the model toward generating more preferable outputs. This method is effective in aligning the model’s outputs with human values and preferences, thereby increasing its practical utility in sensitive applications.

![](finetuning@3x.png)  
RLHF refers to the improvement of the model by learning from feedback, such as ratings, preferences, demonstrations, helpfulness, or toxicity, provided by humans. RLHF is used during the pretraining phase of the model but can also be used to fine-tune the model.

- **Adapting models for specific domains**: This approach involves fine-tuning the model on a corpus of text or data that is specific to a particular industry or sector.  An example of this would be legal documents for a legal AI or medical records for a healthcare AI. This specificity enables the model to perform with a higher degree of relevance and accuracy in domain-specific tasks, providing more useful and context-aware responses.
- **Transfer learning**: This approach is a method where a model developed for one task is reused as the starting point for a model on a second task. For foundational models, this often means taking a model that has been trained on a vast, general dataset, then fine-tuning it on a smaller, specific dataset. This method is highly efficient in using learned features and knowledge from the general training phase and applying them to a narrower scope with less additional training required.
- **Continuous pretraining**: This approach involves extending the training phase of a pre-trained model by continuously feeding it new and emerging data. This approach is used to keep the model updated with the latest information, vocabulary, trends, or research findings, ensuring its outputs remain relevant and accurate over time. 

## Preparing the data for the fine-tuning step

During the initial training phase, a foundational model is trained on a vast and diverse dataset. This dataset typically encompasses a wide range of topics to develop a broad understanding and general capabilities. The goals during this phase are as follows:

- **Extensive coverage**: Ensuring the dataset covers a broad spectrum of knowledge to give the model a robust foundational understanding
- **Diversity**: Including varied types of data from numerous sources to equip the model with the ability to handle a wide array of tasks
- **Generalization**: Focusing on building a model that can generalize across different tasks and domains without specific tailoring

Data preparation for this phase involves collecting as much data as possible. The data is often from publicly available sources, curated datasets, and sometimes proprietary data, depending on the model's intended usage. The data needs thorough cleaning and possibly anonymization to ensure privacy and compliance with regulations.

### Data preparation for fine-tuning

Fine-tuning, on the other hand, is a more targeted process where a pretrained model is adapted to perform well on a specific task or within a particular domain. The data preparation for fine-tuning is distinct from initial training due to the following reasons:

**Specificity**: The dataset for fine-tuning is much more focused, containing examples that are directly relevant to the specific tasks or problems the model needs to solve.
**High relevance**: Data must be highly relevant to the desired outputs. Examples include legal documents for a legal AI or customer service interactions for a customer support AI.
**Quality over quantity**: Although the initial training requires massive amounts of data, fine-tuning can often achieve significant improvements with much smaller, but well-curated datasets.

### Key steps in fine-tuning data preparation

The following list walks through the key steps in fine-tuning data preparation:

1. **Data curation**: Although it is a continuation, this involves a more rigorous selection process to ensure every piece of data is highly relevant. This step also ensures the data contributes to the model's learning in the specific context.
2. **Labeling**: In fine-tuning, the accuracy and relevance of labels are paramount. They guide the model's adjustments to specialize in the target domain.
3. **Governance and compliance**: Considering fine-tuning often uses more specialized data, ensuring data governance and compliance with industry-specific regulations is critical.
4. **Representativeness and bias checking**: It is essential to ensure that the fine-tuning dataset does not introduce or perpetuate biases that could skew the model's performance in undesirable ways.
5. **Feedback integration**: For methods like RLHF, incorporating user or expert feedback directly into the training process is crucial. This is more nuanced and interactive than the initial training phase.

# Model evaluation
## Introduction

When evaluating the performance of language models, especially those involved in generating or transforming text, specific metrics can be used. These metrics are made to assess the quality of the output, compared to a human-written standard. Three commonly used metrics for this purpose are Recall-Oriented Understudy for Gisting Evaluation (ROUGE), Bilingual Evaluation Understudy (BLEU), and BERTScore.

## ROUGE

ROUGE is a set of metrics used to evaluate automatic summarization of texts, in addition to machine translation quality in NLP. The main idea behind ROUGE is to count the number of overlapping units. This includes words, N-grams, or sentence fragments between the computer-generated output and a set of reference (human-created) texts.

The following are two ways to use the ROUGE metric:

**ROUGE-N**: This metric measures the overlap of n-grams between the generated text and the reference text. For example, ROUGE-1 refers to the overlap of unigrams, ROUGE-2 refers to bigrams, and so on. This metric primarily assesses the fluency of the text and the extent to which it includes key ideas from the reference.
**ROUGE-L**: This metric uses the longest common subsequence between the generated text and the reference texts. It is particularly good at evaluating the coherence and order of the narrative in the outputs.
ROUGE is widely used because it is not complex. It is interpretable, and correlates reasonably well with human judgment, especially when evaluating the recall aspect of summaries. The evaluations assess how much of the important information in the source texts is captured by the generated summaries.

## BLEU

BLEU is a metric used to evaluate the quality of text that has been machine-translated from one natural language to another. Quality is calculated by comparing the machine-generated text to one or more high-quality human translations. BLEU measures the precision of N-grams in the machine-generated text that appears in the reference texts and applies a penalty for overly short translations (brevity penalty).

Unlike ROUGE, which focuses on recall, BLEU is fundamentally a precision metric. It checks how many words or phrases in the machine translation appear in the reference translations. BLEU evaluates the quality at the level of the sentence, typically using a combination of unigrams, bigrams, trigrams, and quadrigrams. A brevity penalty discourages overly concise translations that might influence the precision score.

BLEU is popular in the field of machine translation for its ease of use and effectiveness at a broad scale. However, it has limitations in assessing the fluency and grammaticality of the output.

## The BERTScore

BERTScore uses the pretrained contextual embeddings from models like BERT to evaluate the quality of text-generation tasks. BERTScore computes the cosine similarity between the contextual embeddings of words in the candidate and the reference texts. This is unlike traditional metrics that rely on exact matches of N-grams or words.

Because BERTScore evaluates the semantic similarity rather than relying on exact lexical matches, it is capable of capturing meaning in a more nuanced manner. BERTScore is less prone to some of the pitfalls of BLEU and ROUGE. An example of this is their sensitivity to minor paraphrasing or synonym usage that does not affect the overall meaning conveyed by the text.

BERTScore is increasingly used alongside traditional metrics like BLEU and ROUGE for a more comprehensive assessment of language generation models. This is especially true in cases where capturing the deeper semantic meaning of the text is important.

## AnyCompany model evaluation

To learn more about how AnyCompany could use these metrics to evaluate the performance of its model, choose each hotspot.

![](modeleval2@3x.png)

>#### ROUGE
>
>For dynamic product descriptions, ROUGE can be used to ensure completeness of the information. (Reminder: ROUGE measures the overlap of N-grams between the generated product description and a reference product description).

>#### BLEU
>
>Bleu can be used in combination with ROUGE to also ensure the accurate inclusion of critical product features and key phrases that might influence purchase decisions.

>#### BERTScore
>
>For the displayed products, in contrast, the BERTscore can be used. This will assess the semantic appropriateness and personalization of the product recommendation.

In addressing AnyCompany's challenges of high cart abandonment and low repeat purchases, the integration of an FM using generative AI has demonstrated substantial improvements in key business metrics. Post-implementation, the conversion rate increased by 15 percent, thanks to more engaging product descriptions. This enhancement was quantitatively supported by ROUGE scores averaging 0.85. This indicates a high overlap of generated content with reference material, ensuring completeness and relevance that directly encouraged purchases. The average order value saw a 20 percent uplift. This is influenced by the precision and accuracy of technical terms and persuasive language in product descriptions, validated by a BLEU scores of 0.78. These scores are considered good in this context, because they suggest a strong correspondence with the quality of language that historically leads to higher sales.

Additionally, the customer retention rate improved by 25 percent, supported by BERTScore evaluations averaging 0.90. This high score reflects excellent semantic quality of the personalized shopping advice and product displays. This indicates the content is not only accurate, but deeply relevant to individual preferences, thus enhancing customer satisfaction and loyalty.

These metrics, by confirming the high quality and relevance of the AI-generated content, have played a paramount role in achieving AnyCompany’s goals. These goals included enhancing user engagement, reducing cart abandonment, and boosting repeat purchases through improved personalization and content accuracy.

# Knowledge Check
Test your skills

## Question 1

Which methods can be used for fine-tuning a foundation model (FM)? (Choose THREE.) 

- Instruction tuning
- ROUGE
- Transfer learning
- Reinforcement learning from human feedback (RLHF)
- Model pruning
- BLEU

That's correct! Instruction tuning, transfer learning, and RLHF are all methods for fine-tuning a model. Recall that ROUGE and BLEU are metrics used to evaluate the quality of a model's output and model pruning is used to reduce the size and computational complexity of machine learning models.

## Question 2

You are part of a team working on fine-tuning a large language model for a specific domain. To ensure the model's performance is optimized for the target domain, you need to carefully prepare the dataset.

Which of the following steps is most critical in the fine-tuning data preparation process to ensure the model's specialization and accuracy in the target domain?

- Labeling with accurate and relevant labels
- Ensuring data governance and compliance with industry regulations
- Checking for representativeness and addressing potential biases
- Incorporating user or expert feedback 

That's correct! In the fine-tuning process, labeling the data with accurate and relevant labels is crucial for guiding the model's adjustments to specialize in the target domain.

## Question 3

You are evaluating the performance of a language generation model on various text generation tasks, such as machine translation, summarization, and open-ended text generation. To assess the quality of the generated text, you need to choose an appropriate evaluation metric that can capture the semantic similarity between the model's output and human-generated reference texts.

Based on the information provided, which evaluation metric would be the most suitable for this scenario?

- ROUGE
- BLEU
- BERTScore
- Perplexity

That's correct! BERTScore is the most suitable metric for evaluating the semantic similarity between the language generation model's output and human-generated reference texts.