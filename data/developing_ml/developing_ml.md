# Introduction

In this machine learning course, you will learn about the machine learning lifecycle, and how to use AWS services at every stage. Additionally, you will discover the diverse sources for machine learning models and learn techniques to evaluate their performance. You will also understand the importance of machine learning operations (MLOps) in streamlining the development and deployment of your machine learning projects.

# Machine Learning Development Lifecycle

## ML development lifecycle
Machine learning (ML) lifecycle refers to the end-to-end process of developing, deploying, and maintaining machine learning models.

The end-to-end machine learning lifecycle process includes the following phases: 

- Business goal identification
- ML problem framing
- Data processing (data collection, data preprocessing, and feature engineering)
- Model development (training, tuning, and evaluation)
- Model deployment (inference and prediction)
- Model monitoring
- Model retraining

The following illustration shows how the phases work together.
![](ML_Lifecycle_colorset3_NOPROCESS_.png)

#### 1. Define business goals

ML starts with a business objective. Business stakeholders define the value, budget, and success criteria. Defining the success criteria or key performance indicators (KPIs) for the ML workload is critical.  

#### 2. ML problem framing

The problem formulation entails articulating the business problem and converting it into a machine learning problem.

The data scientist, data engineers, and ML architects work with the line of business subject matter experts (SMEs) to determine whether it is appropriate to use ML to solve the business problem. In this phase, the teams might work on discovery. They will determine whether they have the adequate data, skills, and so on to successfully deliver the business solution.

#### 3. Data processing

After they have formulated the problem, the next phase is the data preparation and preprocessing phase.
To train an accurate ML model, developers use data processing to convert data into a usable format.

Data processing steps include data collection and integration, data preprocessing and data visualization, and feature engineering.

Data collection and integration ensures the raw data is in one centrally accessible place. Data preprocessing and data visualization involves transforming raw data into an understandable format. Feature engineering is the process of creating, transforming, extracting, and selecting variables from data.

#### 4. Model development

Model development consists of model training, tuning, and evaluation. 
It is an iterative process that can be performed many times throughout this workflow.

Initially, upon training, the model will not yield the expected results. Therefore, developers will do additional feature engineering and tune the model's hyperparameters before retraining.

#### 5. Retrain

If the model doesn't meet the business goals, it's necessary to take a second look at the data and features to identify ways to improve the model. Building a model is usually an iterative process. This might also involve adjusting the training hyperparameters.

#### 6. Deployment

If the results are satisfactory, the model is deployed into production. The model is now ready to make predictions and inferences against the model.

#### 7. Monitoring

The model monitoring system ensures the model is maintaining a desired level of performance through early detection and mitigation. Monitoring also helps debug issues and understand the model's behavior.

#### 8. Iterations

The machine learning lifecycle is an iterative process. The model is continuously improved and refined as new data becomes available or as requirements change. This iterative nature helps ensure that the model remains accurate and relevant over time.

As a company follows these steps, it is necessary to have seamless collaboration among the diverse roles, such as product managers, developers, data scientists, and engineers. You will learn more about this concept in the MLOps section.

## Use case: Amazon call center
Several years ago, Amazon needed to improve the way it routed customer service calls, so it looked to machine learning for help. 

>#### Business goals
>
> The original Amazon call center routing system worked something like this. A customer would call in and was greeted by a menu: “Press 1 for Returns. Press 2 for Kindle. Press 3 for…,” and so on. The customer would then make a selection and be sent to an agent who would be trained in the specific skills to help the customer.
> 
> During the problem formulation phase of the pipeline, Amazon determined that the current routing system was problematic. Amazon sells many types of products, so the list of things a customer might be calling about is nearly endless. If we didn’t play the right option to a customer calling in, the customer might be sent to a generalist or even to the wrong specialist, who then had to figure out what the customer needed before finally sending them to the agent with the right skills.
> 
> For some businesses, this might not be a problem. For Amazon, dealing with hundreds of millions of customer calls a year, it was inefficient. It cost a lot of money, wasted a lot of time, and worst of all, it was not a good way to get our customers the help they needed.
> 
> ![](AWS_Usecase_Problem2_NOPROCESS_.png)

>#### Problem formulation
>
>The business problem was focused around figuring out how to route customers to agents with the right skills and, therefore, reduce call transfers.
>
>To solve this problem, we needed to predict which skill would solve a customer call.
>
>When converted to a machine learning problem, this became identifying patterns in customer data that we could use to predict accurate customer routing. Based on the wording of this ML problem, it was clear that we were dealing with a multiclass classification problem.

>#### Data collection and integration
>
>Because we wanted to base our predictions on past data from customer service calls, we were dealing with supervised learning. We eventually would train our model on historical customer data that included the correct labels or customer agent skills. Then, the model could make its own predictions on similar data moving forward. For example, predicting that a customer call needed a Kindle skill.
>
>The data we needed came from answering questions like, "What were the customer's recent orders?" "Did the customer own a Kindle?" "Are they Prime members?" The answers to these questions became our features.

>#### Data preprocessing and visualization
>
>We then moved on to the data preparation or preprocessing phase. This phase includes data cleaning and exploratory data analysis.
>
>A lot was done at this point, but one example of data analysis was to think critically about the labels we were using. We asked ourselves a few questions, "Are there any labels we want to exclude from the model for some business reason?" "Are there any labels that are not entirely accurate?" "Are any labels similar enough to be combined?" Finding answers to these questions by exploring the data would help cut down on the number of features being used and simplify our model.
> 
>An example of what we found in this type of analysis was combining labels that represented multiple Kindle skills into one overarching Kindle skill label. That way, every customer who had a problem with a Kindle was routed to an agent trained in all Kindle issues.
>
>Data visualization was the next step, where we did a number of things, including a programmatic analysis, to give us a quick sense of feature and label summaries. This helped us better understand the data we were working with. For example, we could have learned that 40 percent of calls were related to returns, 30 percent were related to Prime memberships, 30 percent were related to Kindle, and so on.
>
>![](AWS_Usecase_Feature_Engineering.jpg)

>#### Model training
>
>A big part of preparing for the training process is to first split your data to ensure a proper division between your training and evaluation efforts.
>
>The fundamental goal of ML is to generalize beyond the data instances used to train models. You want to evaluate your model to estimate the quality of its predictions for the data that the model has not been trained on. However, as is the case in supervised learning, because future instances have unknown target values and you cannot check the accuracy of your predictions for future instances now, you need to use some of the data that you already know the answer for as a proxy for future data.
>
>Evaluating the model with the same data that was used for training is not useful, because it rewards models that can remember the training data, as opposed to generalizing from it.
>
>A common strategy is to split all available labeled data into training, validation, and testing subsets, usually with a ratio of 80 percent,10 percent, and 10percent. (Another common ratio is 70 percent,15 percent, and 15percent.)
>
>![](AWS_Usecase_Data_Split.png)

>#### Model evaluation
>
>After we were happy with how the model interacted with unseen test data, we deployed the model into production and monitored it to make sure that our business problem was indeed being addressed.
>
>Our problem was predicated on the assumption that the ability to more accurately predict skills would reduce the number of transfers a customer experienced. That was put to the test after we deployed, and the number of transfers did decrease, which resulted in a much better customer experience.
>![](AWS_Usecase_Data_Evaluate.png)

>#### Model tuning and feature engineering
>
>After running a training job, we evaluated our model and began a process of iterative tweaks to the model and our data.
>
>For instance, we performed hyperparameter optimization. We tweaked the learning parameters to control how fast or slow our model was learning.
>
>Learning too fast means that the algorithm will never reach an optimum value. Learning too slow means that the algorithm takes too long and might never converge to the optimum in the given number of steps.
>
>We then moved on to feature engineering. We had features that answered questions like, "What was a customer's most recent order?" "What was the time of a customer's most recent order?" "Does the customer own a kindle?" When we feed these features into the model training algorithm, it can only learn from exactly what we show it.

>#### Model deployment
>
>We then deployed the model. It now helps customers get directed to the correct agent the first time.
>
>![](AWS_Usecase_Deploy.png)


# Developing ML Solutions with Amazon SageMaker

## Amazon SageMaker
Amazon SageMaker is a fully managed ML service. In a single unified visual interface, you can perform the following tasks:

- Collect and prepare data.
- Build and train machine learning models.
- Deploy the models and monitor the performance of their predictions.
The following diagrams introduce the various SageMaker features you can use in the machine learning lifecycle.

>#### Amazon SageMaker
>ML process steps.
>You can use Amazon SageMaker to perform all the steps, from data collection to model deployment, in an ML workflow.


>#### Collecting, analyzing, and preparing your data
>
>**Amazon SageMaker Data Wrangler** is a low-code no-code (LCNC) tool. It provides an end-to-end solution to import, prepare, transform, featurize, and analyze data by using a web interface. Customers can add their own Python scripts and transformations to customize workflows. 
>
>For more advanced users and data preparation at scale, **Amazon SageMaker Studio Classic** comes with built-in integration of **Amazon EMR** and **AWS Glue interactive sessions** to handle large-scale interactive data preparation and machine learning workflows within your SageMaker Studio Classic notebook.
>
>Finally, by using the **SageMaker Processing API**, customers can run scripts and notebooks to process, transform, and analyze datasets . They can also use various ML frameworks such as scikit-learn, MXNet, or PyTorch while benefiting from fully managed machine learning environments.
>
>At the end of this step, customers usually end up with features to define the model and data for this model to be trained on.


>#### Managing Features
>
>![](Amazon_Sagemaker_Feature_Store2_NOPROCESS_.png)  
>SageMaker Feature Store options including ingest data, store, and serve.
>
>**Amazon SageMaker Feature Store** helps data scientists, machine learning engineers, and general practitioners to create, share, and manage features for ML development.
>
>Features stored in the store can be retrieved and enriched before being served to the ML models for inferences.


>#### Model training and evaluation
>**SageMaker** provides a training job feature to train and deploy models using built-in algorithms or custom algorithms.
>
>**SageMaker** launches the ML compute instances and uses the training code and the training dataset to train the model. It saves the resulting model artifacts in an Amazon Simple Storage Service (Amazon S3) bucket that can be used later for inference.
>
>Customers aiming at a LCNC option can use **Amazon SageMaker Canvas**. With SageMaker Canvas, they can use machine learning to generate predictions without needing to write any code.
>
>**Amazon SageMaker JumpStart** provides pretrained, open source models that customers can use for a wide range of problem types.

>#### Model evaluation
>
>Customers can use **Amazon SageMaker Experiments** to experiment with multiple combinations of data, algorithms, and parameters, all while observing the impact of incremental changes on model accuracy.
>
>Hyperparameter tuning is a way to find the best version of your models. **Amazon SageMaker Automatic Model Tuning** does that by running many jobs with different hyperparameters in combination and measuring each of them by a metric that you choose.

>#### Deployment
>With **SageMaker**, customers can deploy their ML models to make predictions, also known as inference. **SageMaker** provides a broad selection of ML infrastructure and model deployment options to help meet all your ML inference needs.

>#### Monitoring
>With Amazon SageMaker Model Monitor, customers can observe the quality of SageMaker ML models in production. They can set up continuous monitoring or on-schedule monitoring. SageMaker Model Monitor helps maintain model quality by detecting violations of user-defined thresholds for data quality, model quality, bias drift, and feature attribution drift.

## SageMaker environments
Amazon SageMaker Studio is the recommended option to access SageMaker. It is a web-based UI that provides access to all SageMaker environments and resources.

![](Amazon_Sagemaker_Studio_NOPROCESS_.png)

>#### Sagemaker Studio
>
>This web-based interface gives access to all the actions you can use to develop ML applications, such as prepare data, train, deploy, and monitor models.

> #### Applications
>
> SageMaker Studio offers various applications, including the following:
- **JupyterLab**: A tool to develop Jupyter notebooks, code, and data 
- **Amazon SageMaker Canvas**: A no code machine learning tool to generate predictions without needing to write any code
- **RStudio**: An integrated development environment for the R language
- **Code Editor** (based on Visual Studio Code): Another option to develop code and notebooks while getting access to thousands of VS Code compatible extensions

# Sources of ML Models

## Model implementations
SageMaker supports pre-trained models, built-in algorithms, and custom Docker images. 

The following are ways to use SageMaker to build your ML model:

- Pre-trained models require the least effort and are models ready to deploy or to fine-tune and deploy using **SageMaker JumpStart**.
- Built-in models available in SageMaker require more effort and scale if the dataset is large and significant resources are needed to train and deploy the model.
- If there is no built-in solution that works, try to develop one that uses pre-made images for machine learning and deep learning frameworks for supported frameworks such as scikit-learn, TensorFlow, PyTorch, MXNet, or Chainer.
- You can build your own custom Docker image that is configured to install the necessary packages or software. 

## SageMaker built-in algorithms
There are different types of machine learning algorithms based on your use case and requirements and the data you have.

>#### Introduction
>SageMaker provides algorithms for different categories on machine learning problems.
>
>This is a shortlist of the most common algorithms. Refer to the SageMaker documentation for a complete list and for further details.

>#### Supervised learning
>
>SageMaker provides several built-in general-purpose algorithms that you can use for either classification or regression problems. 

>#### Unsupervised learning
>
>SageMaker provides several built-in algorithms that can be used for unsupervised learning tasks such as clustering, dimension reduction, Topic modelling with pattern recognition, and anomaly detection. 

>#### Image processing
>
>SageMaker also provides image processing algorithms that are used for image classification, object detection, and computer vision, and time series.

>#### Text analysis
>
>SageMaker provides algorithms that are tailored to the analysis of textual documents used in natural language processing, document classification or summarization, topic modeling or classification, and language transcription or translation.

## SageMaker Jumpstart
With SageMaker Jumpstart, you can deploy, fine-tune, and evaluate pre-trained models from the most popular model hubs.

![](Amazon_Sagemaker_Jumpstart_NOPROCESS_.png)  
SageMaker Jumpstart model selection

SageMaker JumpStart provides pretrained open source models from leading providers for a range of problem types to help you get started with machine learning. You can incrementally train and tune these models before deployment. SageMaker JumpStart also provides solution templates that set up infrastructure for common use cases and runnable example notebooks for machine learning with SageMaker. 


# Machine Learning Models Performance Evaluation

## Model evaluation
In this section, you will learn about model evaluation. You will look at which metrics can be used for two very common ML algorithms: classification and regression.

## Model evaluation datasets
Evaluation occurs after a model is trained. The data you use is partitioned into three parts: training set, validation set, and test set. The training set is used to train the model. The validation and test sets are the ones that you will use to evaluate the trained model performance.

>#### Validation set
>
>To begin evaluating how the model responds in a non-training environment, start by looking at the data that was set aside as the validation set. You want to make sure that the model generalizes to data it has not seen. The model still needs to be improved before determining that it’s ready for production. 
>
>![](Validation_set_NOPROCESS_.png)

>#### Test set
>
>After you’ve improved the model using that validation data, you’re ready to test it one last time to ensure its predictive quality meets your standards.
>
>![](Test_dataset_NOPROCESS_.png)


## Model fit
Model fit is important for understanding the root cause of poor model accuracy. This understanding will guide you to take corrective steps. You can determine whether a predictive model is underfitting or overfitting the training data by looking at the prediction error on the training data and the evaluation data.

>#### OVERFITTING
>Overfitting is when the model performs well on the training data but does not perform well on the evaluation data. This is because the model memorized the data it has seen and is unable to generalize to unseen examples.
>![](Fit_Overfit_NOPROCESS_.png)

>#### UNDERFITTING
>Underfitting is when the model performs poorly on the training data. This is because the model is unable to capture the relationship between the input examples (often called X) and the target values (often called Y).
>
>If your model is underfitting and performing poorly on the training data, it could be that the model is too simple (the input features are not expressive enough) to describe the target well. 
>![](Fit_Unnderfit_NOPROCESS_.png)

>#### BALANCED
>The model is balanced when it is not overfit or underfit to the training data. 
>![](Fit_Balanced_NOPROCESS_.png)

## Bias and variance
When evaluating models, both bias and variance contribute to errors the model makes on unseen data, which affects its generalization.
![](Bias_Variance2_NOPROCESS_.png)  
As you begin to look more specifically at evaluation metrics, keep the bias-variance trade-off in mind.

A bullseye is a nice analogy because, generally speaking, the center of the bullseye is where you aim your darts. The center of the bullseye in this situation is the label or target—it predicts the value of your model—and each dot is a result that your model produced during training.

Think about bias as the gap between your predicted value and the actual value, whereas variance describes how dispersed your predicted values are.

In ML, the ideal algorithm has low bias and can accurately model the true relationship. The ideal algorithm also has low variability, by producing consistent predictions across different datasets.
Think about bias as the gap between your predicted value and the actual value, whereas variance describes how dispersed your predicted values are.

![](Bias_Variance2_NOPROCESS_2.png)  
Balanced models have low bias and low variance

## Classification and regression problems 
How you evaluate a machine learning model depends on what kind of ML problem you're working with. In this section, you will look into the classification and regression metrics.

>#### Classification metrics
>- Accuracy
>- Precision
>- Recall
>- F1
>- AUC-ROC

>#### Regression metrics
>- Mean squared error
>- R squared

## Classification problem metrics 

### Classification example
The following is a binary classification problem where an image recognition model labels data as "cat" or "not cat." 

![](Classification_Example2_NOPROCESS_.png)
An example of a simple binary classification problem

To evaluate a classification problem like the one shown, use the following steps:

Step 1: Send the held-out observations where you know the target values to the model. 

Step 2: Compare the predictions returned by the model against the known target value. 

Final Step: Compute a summary metric that shows how well the predicted and true values match.

### Confusion matrix
A confusion matrix can help classify why and how a model gets something wrong. It is the building block for running these types of model evaluations for classification problems. Review the following graphic, which is a confusion matrix for the image recognition example. The matrix gives a high-level comparison of how the predicted classes matched up against the actual classes.

After the model has been applied to the testing data, each of the four boxes in the matrix will include an aggregate number of the unique occurrences of true positives, false positives, false negatives, and true negatives.

![](Confusion_Matrix_NOPROCESS_.png)

>#### True positive (TP)
>
>If the actual label or class is “cat,” which is identified as “P” for positive in the confusion matrix, and the predicted label or class is also “cat,” then you have a true positive result. This is a good outcome for your model.

>#### True Negative (TN)
>
>Similarly, if you have an actual label of “not cat,” which is identified as "N" for negative in the confusion matrix, and the predicted label or class is also “not cat,” then you have a true negative. This is also a good outcome for your model. In both cases, your model predicted the correct outcome when using the testing data.

>#### False positive (FP)
>
>This is less than ideal and is when the actual class is negative, so “not cat,” but the predicted class is positive, so “cat.” This is called a false positive because the prediction is positive but incorrect.

>#### False negative (FN)
>
>This is also less than ideal. A false negative occurs when the actual class is positive, so “cat,” but the predicted class is negative, so “not cat.”

### Accuracy
![](Accuracy_NOPROCESS_.png)  
Calculation for a model's accuracy

To calculate the model’s accuracy, also known as its score, add up the correct predictions and then divide that number by the total number of predictions.

> ℹ️ Although accuracy is a widely used metric for classification problems, it has limitations. This metric is less effective when there are a lot of true negative cases in your dataset. This is why two other metrics are often used in these situations: precision and recall. 

### Precision
Precision removes the negative predictions from the picture. Precision is the proportion of positive predictions that are actually correct. You can calculate it by taking the true positive count and dividing it by the total number of positives.

![](Precision_NOPROCESS_.png)  
Calculation for precision

### Recall
In addition to precision, there is also recall (or sensitivity). In recall, you are looking at the proportion of correct sets that are identified as positive. Recall is calculated by dividing the true positive count by the sum of the true positives and false negatives. By looking at that ratio, you get an idea of how good the algorithm is at detecting, for example, cats.

![](Recall_NOPROCESS_.png)  
Calculation for recall

Think about a model that needs to predict whether a patient has a terminal illness or not. In this case, using precision as your evaluation metric does not account for the false negatives in your model. It is extremely important and vital to the success of the model that it not give false negative results. A false negative would be not identifying a patient as having a terminal illness when the patient actually does have a terminal illness. In this situation, recall is a better metric to use.

### AUC-ROC
Area under the curve-receiver operator curve (AUC-ROC) is another evaluation metric. ROC is a probability curve, and AUC represents the degree or measure of separability.
![](AUC_ROC2_NOPROCESS_.png)  
AUC-ROC uses sensitivity (true positive rate) and specificity (false positive rate)

In general, AUC-ROC can show what the curve for true positive compared to false positive looks like at various thresholds. That means that when you calculate the AUC-ROC curve, you plot multiple confusion matrices at different thresholds and compare them to one another to find out the threshold you need for your business use case.

Example: Email spam classification
Take an example of email spam classification. The emails are rank ordered by the classifier’s risk score. In the following graph, high-scoring emails are on the left, and the vast majority of low-scoring emails are on the right. 

![](AUC_ROC_3_NOPROCESS_.png)   

>1. X-axis - How often your model classified not-spam as spam  (1-specificity)
>
>On the X-axis is the percentage of good emails that are going to be affected by your action—in this case, sidelining emails into spam folder.

>2. Y-axis - How often your model classified actual spam as spam (Sensitivity)
>
>On the y-axis is the percentage of spam you are capturing.

>3. Bad situation - AUC: 0.5 
>
>When AUC is approximately 0.5, your model is equivalent to making random guesses.

>4. Trade-off point - AUC: 0.687
>
>The knee in the curve is a great tradeoff point.  At this point there's a good balance between the good population you impact, and the bad you capture. Of course, if there are different costs to sidelining a population and capturing the bad, you can shift that operating point to the left or to the right. Good classifiers produce good trade-off curves.

>5. Perfect trade-off curve - AUC: 0.893
>
>As you improve the features you use as inputs to the classifier or as you improve the algorithm, the curve shifts up and to the left. The perfect trade-off curve is one that goes along the upper left of the rectangle.

## Regression problem metrics

In case of a regression problem, there are other common metrics you can use to evaluate your model, including mean squared error and R squared. Mean squared error is very commonly used.

### Mean squared error

The general purpose of mean squared error (MSE) is the same as the classification metrics. You determine the prediction from the model and compare the difference between the prediction and the actual outcome.

![](MSE_4_NOPROCESS_.png)  
Calculation for mean squared error

More specifically, you take the difference between the prediction and actual value, square that difference, and then sum up all the squared differences for all the observations.

The smaller the MSE, the better the model's predictive accuracy.

### R squared

R squared is another commonly used metric with linear regression problems. R squared explains the fraction of variance accounted for by the model. It’s like a percentage, reporting a number from 0 to 1. When R squared is close to 1, it usually indicates that a lot of the variance in the data can be explained by the model itself.

MSE focuses on the average squared error of the model's predictions to provide a measure of model performance. R squared provides a measure of the model's goodness of fit to the data. Both are important but provide different perspectives.

## Business metrics

In the previous section, you saw how to evaluate the performance of an ML model. But remember that when initiating a project, business set goals and KPIs are the metrics used to evaluate if the goals are met.

To validate and monitor model performance, establish numerical metrics that directly relate to the KPIs. These KPIs are established in the business goal identification phase. They can include goals such as increasing sales, cutting costs, or decreasing customer churn.

Evaluate whether the performance metrics accurately reflect the business’ tolerance for the error. For instance, false positives might lead to excessive maintenance costs in predictive maintenance use cases. Another example is deciding if acquiring a new customer is more expensive than retaining one. A business should focus on numerical metrics, such as precision and recall, to help differentiate the business requirements and be closer aligned to business value. 

Consider developing custom metrics that tune the model directly for the business objectives. One way is to develop a cost function to evaluate the economic impact of the model. For the cost function, you can specify the cost, or value, of correct predictions and the cost of errors.

By using A/B testing or the canary deployments technique, developers can experiment with two or more variants of a model and help achieve the business goals

# Model Deployment

## Model deployment types

Model deployment is the integration of the model and its resources into a production environment so that it can be used to create predictions.

#### Self-hosted API
In a self-hosted API approach, you deploy and host your ML models on your own infrastructure, either on premises or in the cloud (using virtual machines or containers). This approach involves setting up and managing the necessary infrastructure, such as web servers, load balancers, and databases, to serve your ML models as APIs.

#### Managed API
Managed API services are cloud-based services that provide a fully managed environment for deploying and hosting your ML models as APIs. SageMaker is an example. These services abstract away the underlying infrastructure management so you can focus on building and deploying your models.

Advantages of self-hosted APIs include greater control over the infrastructure, potential cost savings (depending on usage), and the ability to customize the deployment environment. However, this approach requires more operational overhead and responsibility for managing and maintaining the infrastructure.

The choice between a managed API service or a self-hosted API for ML deployment depends on factors such as the specific requirements of your use case, the level of control and customization needed, the available resources and expertise, and cost considerations.

## SageMaker

SageMaker is a fully managed ML service. With SageMaker, data scientists and developers can quickly and confidently build, train, and deploy ML models into a production-ready, hosted environment. Within a few steps, you can deploy a model into a secure and scalable environment.

![](Amazon_Sagemaker_NOPROCESS_.png)

Sagemaker provides the following:

- Deployment with one click or a single API call
- Automatic scaling
- Model hosting services
- HTTPS endpoints that can host multiple models

You can use SageMaker to deploy a model to get predictions in several ways.

#### Real-time
Real-time inference is ideal for inference workloads where you have real-time,   interactive, and low latency requirements. 

#### Batch transform
Use batch transform when you need to get inferences from large datasets and don't need a persistent endpoint. You can also use it when you need to preprocess datasets to remove noise or bias that interferes with training or inference from your dataset.

#### Asynchronous
SageMaker asynchronous inference is a capability in SageMaker that queues incoming requests and processes them asynchronously. This option is ideal for requests with large payload sizes (up to 1GB), long processing times (up to one hour), and near real-time latency requirements. 

#### Serverless
On-demand serverless inference is ideal for workloads that have idle periods between traffic spurts and can tolerate cold starts. It is a purpose-built inference option that you can use to deploy and scale ML models without configuring or managing any of the underlying infrastructure.

# Fundamental Concepts of MLOps

## MLOps

MLOps combines people, technology, and processes to deliver collaborative ML solutions.

![](ML_Lifecycle_MLOPS2_NOPROCESS_.png)  
MLOps goes from model development to model monitoring

MLOps refers to the practice of operationalizing and streamlining the end-to-end machine learning lifecycle from model development and deployment to monitoring and maintenance. It helps ensure that models are not just developed but also deployed, monitored, and retrained systematically and repeatedly.

It is an extension of the DevOps principles and practices to the specific domain of machine learning systems.

![](MLOPS.png)

Like DevOps, MLOps relies on a collaborative and streamlined approach to the machine learning development lifecycle. It is the intersection of people, process, and technology that optimizes the end-to-end activities required to develop, build, and operate machine learning workloads.

## Using MLOps

Applications that expose trained models might have different hosting requirements and strategies than standard applications. Trained models are sensitive to changes in data; therefore, a model-based application that works well when first implemented might not perform as well days, weeks, or months after being implemented. To account for these differences, you need different processes and procedures for applications that are based in managing ML.

MLOps accounts for the unique aspects of artificial intelligence and machine learning (AI/ML) projects in project management, continuous integration and delivery (CI/CD), and quality assurance. With it, you can improve delivery time, reduce defects, and make data science more productive.

## Goals of MLOps

A goal of MLOps is to get ML workloads into production and keep them operating. To meet this goal, MLOps adopts many DevOps principles and practices for the development, training, deployment, monitoring, and retraining of machine learning models. The aim is to use MLOps to do the following:

- Increase the pace of the model development lifecycle through automation.
- Improve quality metrics through testing and monitoring.
- Promote a culture of collaboration between data scientists, data engineers, software engineers, and IT operations.
- Provide transparency, explainability, audibility, and security of the models by using model governance.

## Benefits of MLOps

Adopting MLOps practices gives you faster time-to-market for ML projects by delivering the following benefits.

![](Benefits_MLOPS_NOPROCESS_.png)

>#### Productivity
>By providing self-service environments with access to curated datasets, data engineers and data scientists can move faster and waste less time with missing or invalid data.

>#### Reliability
>By incorporating CI/CD practices, developers can deploy quickly with increased quality and consistency.

>#### Repeatability
>By automating all the steps in the machine learning development lifecycle, you can ensure a repeatable process, including how the model is trained, evaluated, versioned, and deployed.

>#### Auditability
>By versioning all inputs and outputs, from data science experiments to source data to trained models, you can demonstrate exactly how the model was built and where it was deployed.

>#### Data and Model quality
>With MLOps, you can enforce policies that guard against model bias and track changes to data statistical properties and model quality over time.

## Key principles of MLOps

The key principles of MLOps include:

#### Version control
For reproducibility, machine learning workflows must track changes to assets like data, code, and models. It can be rolled back to previous versions when needed.

Overall, version control and code review provide reproducible, trustworthy machine learning.


#### Automation
For repeatability, consistency, and scalability, you can automate the various stages in the machine learning pipeline. This includes the data ingestion, pre-processing, model training, and validation and deployment stages. 

Automated testing helps you discover problems early for fast error fixes and learnings.

#### CI/CD
Through automation, you can continuously test and deploy assets in the following ways:

- Continuous integration extends the validation and testing of code to data and models in the pipeline.
- Continuous delivery automatically deploys the newly trained model or model prediction service.
- Continuous training automatically retrains ML models for redeployment.
- Continuous monitoring uses data monitoring and model monitoring of metrics related to business.
 
#### Model governance
Good governance of machine learning systems requires close collaboration between data scientists, engineers, and business stakeholders. Clear documentation, effective communication channels, and feedback mechanisms help align everyone and improve models over time. It is also crucial to protect sensitive data, secure access, and meet compliance rules. A structured process for reviewing, validating, and approving models before deployment checks for fairness, bias, and ethics. Governance manages all aspects of systems for efficiency.

## ML lifecycle and MLOps

Most ML workloads involve the management of code, data, and models.

![](ML_Lifecycle_MLOPS_Detailed_NOPROCESS_.png)  
ML lifecycle

Managing code, data, and models throughout the ML lifecycle requires the following touchpoints:

- Processing code in data preparation
- Training data and training code in model building
- Candidate models, test, and validation data in model evaluation
- Metadata during model selection
- Deployment-ready models and inference code during deployment
- Production code, models, and data for monitoring

With MLOps, you operationalize the processes around ML model development, deployment, monitoring, and governance.

## Implementing MLOps

The following diagram is an example of an end-to-end automation process. A productionized ML lifecycle typically contains separate training and deployment pipelines.

![](End-to-end-automation2_NOPROCESS_v2.png)

>#### Model build
>The model building pipeline creates new models upon inititation, for example when new data become available.

>#### Model evaluation
>When the model building pipeline completes, you can implement quality control measures at the model registration step. The quality control step can be either manual (human in the loop) or automated.
>
>If a model meets baseline performance metrics, it can be registered with a model registry.

>#### Model approval
>You can use the registry to approve or reject model versions. The model approval action can act as an initiation to start the deployment pipeline.

>#### Model deployment
> The deployment pipeline is most similar to traditional CI/CD systems. This pipeline includes steps such as the following: 
>
>- Source
>- Build 
>- Deployment to staging environment 
>- Testing
>- Promotion to production environment

>#### Model in production
>As soon as the model is in production, you should get feedback from the live system. For ML solutions, monitor the hosting infrastructure, data quality, and model performance.

MLOps levels of implementation can vary depending on organizations and projects.

## AWS services for MLOps

In the following diagram, you can see which AWS services can be used to implement an MLOps pipeline.

![](AWS_MLOPS_Services2_NOPROCESS_.png)

>#### Prepare data
>SageMaker Data Wrangler is a LCNC tool that provides an end-to-end solution to import, prepare, transform, featurize, and analyze data by using a web interface.
>
>By using the SageMaker Processing API, data scientists can run scripts and notebooks to process, transform, and analyze datasets various ML frameworks such as scikit-learn, MXNet, or PyTorch while benefiting from fully managed machine learning environments.

>#### Store features
>SageMaker Feature Store helps data scientists, machine learning engineers, and general practitioners to create, share, and manage features for ML development.

>#### Train
>SageMaker provides a training job feature to train models using built-in algorithms or custom algorithms.

>#### Experiments
>Use SageMaker Experiments to experiment with multiple combinations of data, algorithms, and parameters, all while observing the impact of incremental changes on model accuracy. 

>#### Processing job
>SageMaker Processing refers to the capabilities to run data pre-processing and post-processing, feature engineering, and model evaluation tasks on the SageMaker fully managed infrastructure.

>#### Registry
>With SageMaker Model Registry you can catalog models, manage model versions, manage the approval status of a model, or deploy models to production.

>#### Deployments
>With SageMaker, you can deploy your ML models to make predictions, also known as inference. SageMaker provides a broad selection of ML infrastructure and model deployment options to help meet all your ML inference needs.

>##### Monitor model
>With SageMaker Model Monitor, you can monitor the quality of SageMaker ML models in production.

>#### Pipelines
>You can use Amazon SageMaker Model Building Pipelines to create end-to-end workflows that manage and deploy SageMaker jobs.

# Knowledge Check
The following questions will help you check what you’ve learned. Select the correct answer(s) and choose SUBMIT. 

## Question 1

What is the goal of feature engineering in the machine learning lifecycle?

- To collect and clean data
- To transform data and create variables for the model
- To calculate the model performance
- To maintain the desired level of performance

Feature engineering transforms data into features or inputs that will be valuable for the model.


## Question 2

A small e-commerce company wants to use machine learning to improve their churn prediction. However, the company does not have a dedicated data science team and is looking for a low-code or no-code solution to get started with machine learning. 

Which Amazon SageMaker feature would be the most suitable for the company's requirements?

- Amazon SageMaker Canvas
- Amazon SageMaker JumpStart 
- Amazon SageMaker Data Wrangler
- Amazon SageMaker Feature Store

SageMaker Canvas gives the ability to use machine learning to generate predictions without needing to write any code. 

## Question 3

A company wants to implement a proof of concept about price predictions for a set of items. They are starting from scratch and want a solution with minimal operational overhead.

Which implementation should the company use?

Amazon SageMaker JumpStart 
A custom docker image
A custom script using a supported third-party framework
A custom script using a built-in SageMaker algorithm

This is the correct option because a notebook with a regression example will contain a lot of reusable code.

## Question 4

A company develops a machine learning model to predict the price of a house based on its features, such as the number of bedrooms, bathrooms, square footage, and location. The model is trained on a dataset of historical house sales, and its performance is evaluated using various metrics. However, the model is found to perform well on the training data but poorly on new, unseen data.

Which option describes the fit of model?

- It overfits.
- It underfits. 
- It has a low variance.
- It has a high bias.

The model learned the patterns of the training data but can't generalize. It overfits.

## Question 5

A real-time object detection model has been developed by a team of developers for a self-driving car company to identify various objects in the environment for their autonomous vehicle. The model must be deployed in a way that ensures minimal latency and must be capable of interacting with the vehicle's onboard systems. 

Which AWS deployment options should the team choose to deploy the model to achieve minimal latency while enabling real-time interactions with the onboard systems?

- Real-time
- Asynchronous
- Batch
- Serverless

Real-time inference is ideal for inference workloads where you have real-time, interactive, and low latency requirements.

## Question 6

Which option best describes machine learning operations (MLOps)?

- MLOps is a framework that focuses solely on the development and training of ML models. 
- MLOps is a process that involves deploying ML models in a production environment and maintaining them over time.
- MLOps is a set of practices that aims to manage the end-to-end lifecycle of machine learning (ML) systems, including development, deployment, monitoring, and maintenance.
- MLOps is a tool used for visualizing and analyzing the performance of machine learning (ML) models.

MLOps is a set of practices and principles that aims to manage the entire lifecycle of machine learning systems, from model development and training to deployment, monitoring, and maintenance. It provides a structured approach to streamlining the ML workflow, ensuring reliability, scalability, and reproducibility.

You learned about the machine learning lifecycle, how to leverage AWS service at every step. You also learned techniques to evaluate ML models performance, and understand the importance of MLOps in streamlining the development and deployment of your machine learning projects.

# Conclusion
## Machine learning development lifecycle

Machine learning development lifecycle

The Machine learning lifecycle refers to the end-to-end process of developing, deploying, and maintaining machine learning models from identifying the business problem to the deploying and monitoring the model.

## Machine learning AWS services

SageMaker is the fully managed ML service from AWS that you can use to perform all the steps of an ML workflow, from data collection to model deployment. 

In a single unified visual interface, you can perform the following tasks:
- Collect and prepare data with a low-code tool such as SageMaker Data Wrangler or your custom scripts, notebooks, or data processing containers.
- Build and train machine learning models with a low-code solution such as SageMaker Canvas. You can also use pre-trained algorithms, built-in algorithms, or supported ML frameworks such as scikit-learn, MXNet, or PyTorch. Finally, you can also bring your own custom packages and code by bringing custom Docker images while benefiting from the managed infrastructure of SageMaker.
- Deploy the models and monitor the performance of their predictions.

## Machine learning models

SageMaker supports pre-trained models, built-in algorithms, and custom Docker images. It provides several built-in general-purpose algorithms that can be used for the following:

- Supervised learning with either classification or regression problems
- Unsupervised learning for tasks such as clustering, dimension reduction, pattern recognition, and anomaly detection
- Image processing for image classification, object detection, and computer vision as well as time series
- The analysis of textual documents used in natural language processing, document classification or summarization, topic modeling or classification, and language transcription or translation

## Machine learning model performance evaluation

Evaluation occurs after a model has been trained. The data you use is partitioned into three parts: training set, validation set, and test set. 

A model can be underfit, overfit, or balanced. Underfit is when the model performs poorly on the training data. Overfit when the model performs well on the training data but does not perform well on the evaluation data. Overfitting and underfitting are linked to the bias (the gap between your predicted value and the actual value) and the variance (how dispersed your predicted values are) of the models.

Balanced models have low bias and low variance

## Model deployment

Model deployment is the integration of the model and its resources into a production environment so that it can be used to create predictions. Deployment options are self-hosted, when you deploy the model on your own infrastructure, or managed, when you deploy your models on a managed cloud platform.

You can use SageMaker to deploy a model to get predictions in several ways: real time, batch, serverless, or asynchronous.

## MLOps

MLOps goes from model development to model monitoring

Machine learning operations, or MLOps, refers to the practice of operationalizing and streamlining the end-to-end machine learning lifecycle, from model development and deployment to monitoring and maintenance. It helps ensure that models are not just developed but also deployed, monitored, and retrained systematically and repeatedly.

It is an extension of the DevOps principles and practices to the specific domain of machine learning systems.