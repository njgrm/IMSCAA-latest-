MODULE 1 HANDOUT
Understanding AI and Data
Module Overview
Artificial intelligence (AI) has become increasingly integrated into the technologies people
use for learning, communication, work, entertainment, and everyday decision-making.
Navigation applications recommend routes, streaming platforms recommend content, email
systems identify spam, voice assistants process spoken requests, and generative AI systems
can produce text, images, audio, video, and computer code.
However, using AI effectively requires more than knowing how to operate an AI application.
Users need to understand what AI is, how AI systems use data, how models produce outputs,
what AI can and cannot do, and when human judgment is necessary.
This module introduces the fundamental concepts needed to understand AI and data. It
establishes the relationship among artificial intelligence, machine learning, and generative
AI, and explains how data, training, models, inputs, and outputs are connected.
The module also emphasizes an important principle: AI-generated output should not
automatically be treated as verified or authoritative information. AI systems can produce
useful results, but they can also make mistakes, reflect limitations in their data or design, and
produce outputs that require human evaluation.
Module-Level Learning Objectives
At the end of this unit, students will be able to:
MO1.1: Explain fundamental concepts of artificial intelligence and data, including how AI
systems learn and generate outputs.
MO1.2: Distinguish their capabilities, limitations, and appropriate applications.
1. Understanding Artificial Intelligence
1.1 What Is Artificial Intelligence?
Artificial intelligence is a broad field of computing concerned with developing systems capable
of performing tasks commonly associated with human intelligence.
These tasks may include:
• recognizing patterns;
• processing information;
• making predictions;
Page 2/21
• understanding or processing
language;
• solving problems;
• classifying information;
• making recommendations; and
• generating content.
AI is therefore not a single technology or application. It is an extensive field encompassing
many approaches, techniques, systems, and applications.
For example, when a navigation application recommends a route, an AI-based system may
process information about roads, traffic, locations, and previous patterns to help determine a
suitable route.
Similarly, when an email system flags a message as potentially spam, it may analyze its
characteristics and compare them with patterns learned from previous examples.
Key Idea
1.2 What AI Is Not
It is important not to interpret the term artificial intelligence too literally.
An AI system does not necessarily:
• think like a human;
• understand the world in the same way a human does;
• possess human experiences;
• have human intentions;
• automatically know whether information is true; or
• possess common sense equivalent to that of a person.
AI systems operate according to their design, algorithms, models, data, and computational
processes.
Therefore, an AI system producing a fluent answer does not necessarily indicate that it has
a human-like understanding of the topic.
This distinction is particularly important when working with generative AI.
Example
Suppose a student asks for an AI system:
AI is a broad field of computing that involves systems designed to perform
tasks associated with human intelligence.
Page 3/21
Artificial Intelligence
Machine Learning
Generative AI
"Explain photosynthesis."
The system may generate a clear and well-written explanation. However, the quality of the
wording alone does not establish that every statement is correct.
The user still needs to evaluate the information.
2. AI, Machine Learning, and Generative AI
Three terms frequently encountered when discussing modern AI are:
• Artificial Intelligence (AI)
• Machine Learning (ML)
• Generative AI (GenAI)
These concepts are related, but they should not be treated as identical.
Conceptual Relationship
This diagram provides a useful introductory way to visualize their relationship, although it is
a simplified representation. In technical discussions, machine learning is a major approach
within AI, while generative AI refers to AI systems designed to generate new content and
commonly relies on machine-learning techniques.
Remember
Fluent ≠ necessarily factual
Confident ≠ necessarily correct
Page 4/21
Examples/Data
Machine-learning
algorithm
Learned patterns
Prediction or
clarification of new data
3. Machine Learning
3.1 What Is Machine Learning?
Machine learning (ML) is an approach within AI in which computational systems learn
patterns from data and use those patterns to make predictions or inferences about new data.
IBM describes machine learning as a branch of AI that uses algorithms and statistical
techniques to enable systems to learn from data and improve their performance on tasks.
Instead of explicitly programming a computer with a rule for every possible situation,
machine-learning systems can identify patterns from examples.
Example: Spam Detection
Consider an email system designed to identify spam.
A traditional rule-based system might contain rules such as:
• If the message contains a particular word → mark as spam.
• If the sender is unknown → mark as spam.
• If the message contains a particular type of link → mark as spam.
A machine-learning approach can instead use many examples of:
• spam messages; and
• legitimate messages.
The system can learn patterns from these examples and apply them when processing new
messages.
Simplified Process
Page 5/21
3.2 Learning from Examples
The term "learning" in machine learning should be understood carefully.
A machine-learning system does not learn in the same way that a human student learns.
Instead, the system mathematically adjusts parameters in a computational model using data
and an optimization process.
The resulting model can then be used to make predictions or inferences when new data is
provided.
Key Term: Pattern
A pattern is a regularity or relationship that can be identified within data.
For example, a model trained using many images of cats and dogs may identify visual
features that help distinguish between the two categories.
4. Generative Artificial Intelligence
4.1 What Is Generative AI?
Generative AI refers to AI systems capable of producing new content in response to an input
or instruction.
Depending on the system, generated content may include:
• text;
• images;
• audio;
• video;
• computer code; and
• other forms of digital content.
Microsoft Learn describes generative AI as AI technology capable of creating content from
prompts or other inputs.
Examples include:
• generating an explanation of a topic;
• creating an image from a textual description;
• producing a summary;
• generating computer code;
• creating a draft of a document; or
• transforming existing information into another format.
Page 6/21
User
Prompt/Input
AI Module
Generated Output
Human Evaluation
4.2 Generative AI and Prompts
A prompt is an instruction, question, or input provided to a generative AI system.
For example:
"Explain machine learning to a first-year college student using a simple example."
The AI system processes the input and generates an output based on its learned patterns
and the capabilities of its model.
The prompt, therefore, plays an important role in the interaction between the user and the AI
system.
Basic Interaction
The final step is particularly important.
AI-generated content should be evaluated rather than automatically accepted.
5. AI and Data
5.1 Why Data Matters
Data plays an important role in many AI and machine-learning systems.
Data can take many forms, including:
• text;
• numbers;
• images;
• audio;
• video;
• sensor information;
Page 7/21
• records; and • other digital information.
Data can provide examples that machine-learning systems use to identify patterns.
Example: Cat and Dog Classification
Imagine we want to develop a system that can distinguish between cats and dogs.
We could provide the system with many labeled examples:
Images of cats
Images of dogs
During training, the system processes these examples and learns patterns associated with
the categories.
Once trained, the model can receive a new image and produce a prediction.
6. Training Data
6.1 What Is Training Data?
Training data is data used during the process of developing or training a machine-learning
model.
The training data provides examples from which the system can learn patterns.
The quality and characteristics of training data can therefore influence the resulting model.
Important Questions About Data
When considering AI systems, ask:
1. What data was used?
Page 8/21
Training Data
Training Process
Model
New Input
Output
2. Is the data relevant to the task?
3. Is the data sufficiently representative?
4. Does the data contain errors?
5. Could the data contain biases?
6. Is the amount of data appropriate?
7. How current is the information?
These questions help explain why AI performance can vary across different situations.
7. Models
7.1 What Is an AI Model?
A model is a computational representation of patterns learned from data.
During training, a machine-learning system processes examples and adjusts its internal
parameters.
The resulting model can then be used to process new inputs.
A simplified representation is:
7.2 Training vs. Inference
Two important terms are training and inference.
Training
Training is the process through which a model learns patterns from data.
Page 9/21
Data
Training
Model
New Input
Output
Inference
Inference is the process of using a trained model to process new data and produce a
prediction, classification, generation, or other output.
Example
Suppose a model is trained using thousands of labeled images of cats and dogs.
Training:
The model processes the existing examples and learns patterns.
Inference:
A new photograph is presented to the trained model.
The model might produce:
"Dog — 94% confidence."
The output is a prediction generated by the model. It is not necessarily an absolute statement
of reality.
8. From Data to Output
A useful way to understand AI systems is to follow the flow from data to output.
The Basic Process
Each stage has a different role.
Data
Provides examples or information.
Page 10/21
Prompt
Generative AI Model
Generated Output
Human Evaluation
Training
Allows the system to learn patterns from the available training data.
Model
Represents patterns learned through the training process.
New Input
Provides information that the trained model needs to process.
Output
The model's resulting prediction, classification, recommendation, or generated content.
9. Generative AI: From Prompt to Output
Generative AI follows a related process.
A simplified interaction can be represented as:
Page 11/21
For example:
The last step is essential because the output generated may contain errors or unsupported
claims.
10. AI-Generated Output Is Not Automatically a Verified Fact
One of the most important concepts in this module is the distinction between generation and
verification.
An AI model can generate a response that appears:
• clear;
• detailed;
• professional;
• persuasive; or
• confident.
However, these characteristics do not guarantee factual accuracy.
AI systems can produce incorrect information, including fabricated or unsupported content.
This is sometimes referred to as an AI hallucination.
Prompt:
"Write a 150-word explanation
of machine learning."
Model processes the input
Generated explanation
Student checks accuracy,
relevance, and quality
Page 12/21
Example
A student asks:
"Give me three academic references about a particular topic."
The system may produce references that look realistic.
The student should not automatically assume that they exist.
Instead, the student should:
1. Check whether each source actually exists.
2. Verify the authors.
3. Verify the title.
4. Check the publication information.
5. Locate the original source.
6. Confirm that the source supports the claim.
Key Principle
11. Common Applications of AI
AI is used across many areas of society.
11.1 Education
AI can support:
• personalized learning;
• tutoring and explanation;
• feedback;
• content creation;
• educational administration;
• accessibility tools; and
• learning analytics.
However, AI should support rather than automatically replace educational judgment.
Students and educators need to consider accuracy, academic integrity, privacy, and
appropriate use.
AI can assist with information, but users remain responsible for evaluating and verifying
important outputs.
Page 13/21
11.2 Business
Businesses use AI for tasks such as:
• recommendations;
• forecasting;
• customer support;
• document processing;
• data analysis;
• fraud detection;
• marketing analysis; and
• automation.
For example, an online store may use recommendation systems to suggest products based
on user behavior and other information.
11.3 Healthcare
AI can support healthcare-related activities such as:
• analyzing medical information;
• identifying patterns in data;
• supporting prediction;
• assisting research; and
• supporting clinical decision-making.
However, healthcare is a high-stakes context. AI outputs require appropriate professional
oversight and should not automatically replace qualified human judgment.
11.4 Everyday Technology
People encounter AI in many ordinary applications, including:
• search engines;
• navigation;
• recommendation systems;
• spam filtering;
• speech recognition;
• translation;
• virtual assistants; and
• content-generation tools.
This means AI literacy is becoming increasingly relevant to everyday digital life.
12. AI Capabilities
AI systems can perform many useful tasks.
Page 14/21
AI CAN:
Recognize Patterns
AI systems can identify patterns within large collections of data.
Process Information
AI can process large quantities of information rapidly.
Make Predictions
Machine-learning systems can use learned patterns to make predictions or classifications.
Generate Content
Generative AI can produce text, images, audio, video, and code.
Automate Certain Tasks
AI can assist with repetitive or data-intensive tasks.
13. AI Limitations
Understanding what AI cannot do is equally important.
AI HAS LIMITATIONS
13.1 AI Can Make Errors
AI systems can produce incorrect outputs.
Even highly capable systems can make mistakes.
13.2 AI Does Not Guarantee Truth
An AI system is not automatically a fact-checking authority.
An output can sound convincing even if it is incorrect.
13.3 Performance Depends on Data and Task
An AI system may perform well on one task but poorly on another.
Performance can be affected by:
• training data;
• model design;
Page 15/21
• input quality;
• task complexity;
• context; and
• system limitations.
13.4 AI May Not Understand Context Like a Human
Human beings use experience, cultural knowledge, physical experience, social awareness,
and contextual reasoning when interpreting situations.
AI systems process inputs through computational mechanisms and do not necessarily
possess human-like understanding.
13.5 Human Judgment Remains Necessary
AI should not automatically be treated as an unquestionable authority.
Human judgment is particularly important when:
• the decision has significant consequences;
• information is uncertain;
• the AI output conflicts with reliable evidence;
• ethical considerations are involved;
• personal or confidential information is involved; or
• accuracy is essential.
14. Appropriate Applications of AI
Understanding AI involves asking not only "Can AI do this?" but also:
"Should AI be used for this task, and under what conditions?"
An AI system may technically be capable of performing a task without being appropriate for
making the final decision.
Consider Three Questions
1. Is AI capable of performing the task?
Does technology have the appropriate functionality?
2. Is AI appropriate for the task?
Page 16/21
Are the risks acceptable?
3. Is human oversight necessary?
Should a person review or approve the result?
15. AI Capability vs. Appropriate Use
AI Capability Appropriate Use Question
Can process large amounts of
information
Is the information being processed appropriately?
Can generate text Does the output need human review?
Can make predictions What are the consequences if the prediction is
wrong?
Can recognize patterns Is the training data suitable?
Can automate tasks Is automation appropriate for the task?
Can summarize information Has the summary been checked for accuracy?
The ability of AI to perform a task does not automatically mean that AI should independently
perform that task.
16. Human-AI Collaboration
A useful way to think about AI is not simply human versus AI, but human working with AI.
A human can:
• define the problem;
• provide appropriate instructions;
• provide relevant context;
• evaluate AI output;
• verify important information;
• identify errors;
• apply ethical judgment; and
• make the final decision when
appropriate.
AI can:
• process information;
• identify patterns;
• generate possibilities;
• draft content;
• summarize information;
• provide recommendations; and
• automate selected tasks.
Page 17/21
ARTIFICIAL INTELLIGENCE
Broad field
MACHINE LEARNING
Systems learn patterns from data
GENERATIVE AI
Systems generate new content
17. Key Vocabulary
Term Definition
Artificial
Intelligence (AI)
A broad field of computing concerned with systems capable of
performing tasks associated with aspects of human intelligence.
Machine Learning
(ML)
An approach within AI in which systems learn patterns from data and
use them to make predictions or inferences.
Generative AI AI systems are designed to generate new content such as text,
images, audio, video, or code.
Data Information that can be processed by computational systems,
including text, numbers, images, audio, and other forms.
Training Data Data used during the training of a machine-learning model.
Model A computational representation of patterns learned from data.
Training The process through which a model learns patterns from data.
Inference Using a trained model to process new information and produce an
output.
Prompt An instruction, question, or other input provided to a generative AI
system.
Output The result produced by an AI system in response to an input.
Prediction An output is an estimate or classification based on learned patterns.
AI Hallucination An incorrect, fabricated, or unsupported output generated by an AI
system.
18. Concept Map
The central concepts of Module 1 can be summarized as follows:
AI CONCEPTS
Human + AI
Human judgment + AI capabilities = More informed and responsible use of AI
Page 18/21
AI DATA PROCESS
This final stage reminds us that AI output should be evaluated according to the task's
requirements.
19. Worked Example: Using AI to Explain a Topic
Imagine that a student needs to understand machine learning.
Step 1: The student provides an input
"Explain machine learning using an example about spam email."
Step 2: The AI processes the request
The AI system processes the prompt using its model.
Step 3: The AI generates an output
The system produces an explanation.
Step 4: The student evaluates the response
The student asks:
• Is the explanation accurate?
• Is it appropriate for my level?
• Are the examples correct?
DATA
TRAINING
MODEL
NEW INPUT / PROMPT
HUMAN EVALUATION
Page 19/21
• Are there claims that need verification?
• Does the response answer my actual question?
Step 5: The student uses judgment
The student may revise the prompt, consult reliable sources, and improve the explanation.
This illustrates an important principle:
Effective AI use involves interaction, evaluation, and human judgment—not simply
accepting the first output.
Module Summary
In this module, you learned that artificial intelligence is a broad field of computing that involves
systems designed to perform tasks associated with human intelligence.
You also learned that machine learning is an important approach within AI that uses data to
learn patterns and make predictions or inferences.
Generative AI refers to AI systems capable of generating new content such as text, images,
audio, video, and computer code.
Data plays an important role in AI and machine learning. Training data provides examples
that can be used during model development. Through training, a model learns patterns that
can later be applied to new inputs.
The overall process can be simplified as:
For generative AI, this can be viewed as:
Finally, AI has both capabilities and limitations. AI can recognize patterns, process
information, make predictions, generate content, and automate certain tasks. However, AI
can also make errors, produce unsupported information, and perform differently depending
on the data, model, task, and context.
Therefore, effective use of AI requires critical evaluation and appropriate human
judgment.
24. Key Takeaways for MO1
To demonstrate MO1, you should be able to explain:
Data Training Model New Input Output
Prompt Model Generated Output Human Evaluation
Page 20/21
• what artificial intelligence means;
• what AI does and does not mean;
• what machine learning is;
• what generative AI is;
• how AI, ML, and GenAI are related;
• Why data is important;
• what training data is;
• what an AI model is;
• the difference between training and
inference;
• how inputs and prompts produce
outputs; and
• Why AI-generated output should be
evaluated.
25. Key Takeaways for MO1.2
To demonstrate MO1.2, you should be able to distinguish:
AI Capabilities
AI can:
• recognize patterns;
• process information;
• make predictions;
• generate content; and
• automate selected tasks.
AI Limitations
AI:
• can make mistakes;
• does not guarantee truth;
• depends on data and model
characteristics;
• may not interpret context like a
human; and
• requires appropriate human
judgment.
Appropriate Application
You should consider:
Capability + Context + Risk + Human Oversight
before deciding how to use AI.
Page 21/21
References
IBM. (n.d.). What is machine learning? IBM Think. IBM: What is Machine Learning?
Microsoft. (n.d.). Introduction to generative AI and agents. Microsoft Learn. Microsoft Learn:
Introduction to generative AI and agents
National Institute of Standards and Technology. (2023). Artificial intelligence risk
management framework (AI RMF 1.0). U.S. Department of Commerce.
https://doi.org/10.6028/NIST.AI.100-1
Russell, S., & Norvig, P. (2021). Artificial intelligence: A modern approach (4th ed.). Pearson.
UNESCO. (2023). Guidance for generative AI in education and research. UNESCO.
https://unesdoc.unesco.org/ark:/48223/pf0000386693
Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep learning. MIT Press. Deep Learning
– MIT Press