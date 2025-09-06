# AWS AI Practitioner - Key Definitions (OpenAI Extracted)

*Extracted using gpt-5-mini with exact wording preservation*

## Fundamentals

### Generative AI

Generative AI is a branch of artificial intelligence that focuses on creating new content, such as text, images, audio, or even computer code, from existing data.

*Source: fundamentals.md - ## Welcome video*

---

### text generation

One of the most popular applications of generative AI is text generation, where models like Amazon Titan and Anthropic’s Claude can produce human-like writing on virtually any topic, from creative stories to technical reports.

*Source: fundamentals.md - ## Welcome video*

---

### AI

AI is a broad field that encompasses the development of intelligent systems capable of performing tasks that typically require human intelligence, such as perception, reasoning, learning, problem-solving, and decision-making. AI serves as an umbrella term for various techniques and approaches, including machine learning, deep learning, and generative AI, among others.

*Source: fundamentals.md - ## Artificial intelligence (AI)*

---

### Machine learning (ML)

ML is a type of AI for understanding and building methods that make it possible for machines to learn. These methods use data to improve computer performance on a set of tasks.

*Source: fundamentals.md - ## Machine learning (ML)*

---

### Deep learning (DL)

Deep learning uses the concept of neurons and synapses similar to how our brain is wired.

*Source: fundamentals.md - ## Deep learning (DL)*

---

### Generative AI

Generative AI is a subset of deep learning because it can adapt models built using deep learning, but without retraining or fine tuning.

*Source: fundamentals.md - ## Generative AI*

---

### Generative AI systems

Generative AI systems are capable of generating new data based on the patterns and structures learned from training data.

*Source: fundamentals.md - ## Generative AI*

---

### Building a machine learning model

Building a machine learning model involves data collection and preparation, selecting an appropriate algorithm, training the model on the prepared data, and evaluating its performance through testing and iteration.

*Source: fundamentals.md - ## Generative AI*

---

### Labeled data

Labeled data is a dataset where each instance or example is accompanied by a label or target variable that represents the desired output or classification. These labels are typically provided by human experts or obtained through a reliable process.

*Source: fundamentals.md - ### Labeled data*

---

### Unlabeled data

Unlabeled data is a dataset where the instances or examples do not have any associated labels or target variables. The data consists only of input features, without any corresponding output or classification.

*Source: fundamentals.md - ### Unlabeled data*

---

### Structured data

Structured data refers to data that is organized and formatted in a predefined manner, typically in the form of tables or databases with rows and columns. This type of data is suitable for traditional machine learning algorithms that require well-defined features and labels.

*Source: fundamentals.md - ### Structured data*

---

### Tabular data

This includes data stored in spreadsheets, databases, or CSV files, with rows representing instances and columns representing features or attributes.

*Source: fundamentals.md - ### Structured data*

---

### Time-series data

This type of data consists of sequences of values measured at successive points in time, such as stock prices, sensor readings, or weather data.

*Source: fundamentals.md - ### Structured data*

---

### Unstructured data

Unstructured data is data that lacks a predefined structure or format, such as text, images, audio, and video. This type of data requires more advanced machine learning techniques to extract meaningful patterns and insights.

*Source: fundamentals.md - ### Unstructured data*

---

### Text data

This includes documents, articles, social media posts, and other textual data.

*Source: fundamentals.md - ### Unstructured data*

---

### Image data

This includes digital images, photographs, and video frames.

*Source: fundamentals.md - ### Unstructured data*

---

### Inferencing

After the model has been trained, it is time to begin the process of using the information that a model has learned to make predictions or decisions. This is called inferencing.

*Source: fundamentals.md - ## Inferencing*

---

### Batch inferencing

Batch inferencing is when the computer takes a large amount of data, such as images or text, and analyzes it all at once to provide a set of results. This type of inferencing is often used for tasks like data analysis, where the speed of the decision-making process is not as crucial as the accuracy of the results.

*Source: fundamentals.md - ### Batch inferencing*

---

### Computer vision

Computer vision is a field of artificial intelligence that makes it possible for computers to interpret and understand digital images and videos.

*Source: fundamentals.md - ### Computer vision*

---

### Natural language processing (NLP)

Natural language processing (NLP) is a branch of artificial intelligence that deals with the interaction between computers and human languages.

*Source: fundamentals.md - ### Natural language processing (NLP)*

---

### foundation models (FMs)

Generative AI is powered by models that are pretrained on internet-scale data, and these models are called foundation models (FMs).

*Source: fundamentals.md - ## Foundation models*

---

### Diffusion

Diffusion is a deep learning architecture system that starts with pure noise or random data.

*Source: fundamentals.md - ## Diffusion models*

---

### Diffusion models

The models gradually add more and more meaningful information to this noise until they end up with a clear and coherent output, like an image or a piece of text. Diffusion models learn through a two-step process of forward diffusion and reverse diffusion.

*Source: fundamentals.md - ## Diffusion models*

---

### Forward diffusion

Using forward diffusion, the system gradually introduces a small amount of noise to an input image until only the noise is left over.

*Source: fundamentals.md - ### Forward diffusion*

---

### Reverse diffusion

In the subsequent reverse diffusion step, the noisy image is gradually introduced to denoising until a new image is generated.

*Source: fundamentals.md - ### Reverse diffusion*

---

### Multimodal models

Instead of just relying on a single type of input or output, like text or images, multimodal models can process and generate multiple modes of data simultaneously.

*Source: fundamentals.md - ## Multimodal models*

---

### Multimodal models

These kinds of models learn how different modalities like images and text are connected and can influence each other.

*Source: fundamentals.md - ## Multimodal models*

---

### GANs

GANs are a type of generative model that involves two neural networks competing against each other in a zero-sum game framework. The two networks are generator and discriminator.

*Source: fundamentals.md - ### Generative adversarial networks (GANs)*

---

### Generator

This network generates new synthetic data (for example, images, text, or audio) by taking random noise as input and transforming it into data that resembles the training data distribution.

*Source: fundamentals.md - ### Generative adversarial networks (GANs)*

---

### Discriminator

This network takes real data from the training set and synthetic data generated by the generator as input. Its goal is to distinguish between the real and generated data.

*Source: fundamentals.md - ### Generative adversarial networks (GANs)*

---

### **Retrieval-augmented generation (RAG)**

is a technique that supplies domain-relevant data as context to produce responses based on that data. This technique is similar to fine-tuning. However, rather than having to fine-tune an FM with a small set of labeled examples, RAG retrieves a small set of relevant documents and uses that to provide context to answer the user prompt. RAG will not change the weights of the foundation model, whereas fine-tuning will change model weights.

*Source: fundamentals.md - ### Retrieval-augmented generation*

---

### Amazon Q Developer (previously Amazon CodeWhisperer)

Amazon Q Developer (previously Amazon CodeWhisperer) can generate code in real time.

*Source: fundamentals.md - ### Accelerated development and deployment*

---

### SageMaker

SageMaker handles tasks such as data preprocessing, model training, and deployment.

*Source: fundamentals.md - ### Accelerated development and deployment*

---

### Amazon Bedrock

Amazon Bedrock provides access to pre-trained models and APIs.

*Source: fundamentals.md - ### Accelerated development and deployment*

---

### pay-as-you-go pricing models

With pay-as-you-go pricing models, businesses only pay for the resources that they consume.

*Source: fundamentals.md - ### Scalability and cost optimization*

---

### AWS global infrastructure and distributed computing capabilities

AWS global infrastructure and distributed computing capabilities permit applications to scale seamlessly across regions and handle large datasets or high-volume traffic.

*Source: fundamentals.md - ### Scalability and cost optimization*

---

### Flexibility and access to models

AWS continuously updates and expands its AI services, providing access to the latest advancements in machine learning models, techniques, and algorithms.

*Source: fundamentals.md - ### Flexibility and access to models*

---

### Amazon Bedrock

Amazon Bedrock offers a choice of high-performing FMs from leading AI companies like AI21 Labs, Anthropic, Cohere, Meta, Mistral AI, Stability AI, and AWS, through a single API.

*Source: fundamentals.md - ### Flexibility and access to models*

---

### Services like Amazon Comprehend and Amazon Rekognition

Services like Amazon Comprehend and Amazon Rekognition offer ready-to-use AI capabilities that can be readily incorporated into applications.

*Source: fundamentals.md - ### Integration with AWS tools and services*

---

### AWS AI services

AWS AI services seamlessly integrate with other AWS services, so developers can build end-to-end solutions that use multiple cloud services.

*Source: fundamentals.md - ### Integration with AWS tools and services*

---

### The AWS ecosystem

The AWS ecosystem provides a wide range of tools, SDKs, and APIs, so developers can incorporate AI capabilities into their existing applications or build entirely new AI-driven applications.

*Source: fundamentals.md - ### Integration with AWS tools and services*

---

### Responsiveness and availability

AWS generative AI services are designed to be highly responsive and available. However, higher levels of responsiveness and availability often come at an increased cost. For example, services with lower latency and higher availability (for example, multi-Region deployment) will typically have higher pricing compared to alternatives with lower performance and availability guarantees.

*Source: fundamentals.md - ### Responsiveness and availability*

---

### Redundancy and Regional coverage

To ensure redundancy and high availability, AWS generative AI services can be deployed across multiple Availability Zones or even across multiple AWS Regions. This redundancy comes with an additional cost, because resources have to be provisioned and data replicated across multiple locations.

*Source: fundamentals.md - ### Redundancy and Regional coverage*

---

### compute options

AWS offers different compute options (for example, CPU, GPU, and custom hardware accelerators) for generative AI services.

*Source: fundamentals.md - ### Performance*

---

### Higher-performance options

Higher-performance options, such as GPU instances, generally come at a higher cost but can provide significant performance improvements for certain workloads.

*Source: fundamentals.md - ### Performance*

---

### Token-based pricing

This means that you pay for the number of tokens (a unit of text or code) generated or processed by the service.

*Source: fundamentals.md - ### Token-based pricing*

---

### Provisioned throughput

Some AWS generative AI services, like Amazon Polly and Amazon Transcribe, let you provision a specific amount of throughput (for example, audio or text processing capacity) in advance. Higher provisioned throughput levels typically come at a higher cost but can ensure predictable performance for time-sensitive workloads.

*Source: fundamentals.md - ### Provisioned throughput*

---

### Custom models

AWS provides pre-trained models for various generative AI tasks, but you can also bring your own custom models or fine-tune existing models.

*Source: fundamentals.md - ### Custom models*

---

