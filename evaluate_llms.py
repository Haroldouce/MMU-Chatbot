import sys
import os
import time
import pandas as pd
from datasets import Dataset
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Setup path so we can import from server
sys.path.append(os.path.join(os.path.dirname(__file__), "server"))

from server.rag_api import rag_query

from langchain_community.chat_models import ChatOllama
from langchain_huggingface import HuggingFaceEmbeddings
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    faithfulness,
    context_recall,
    context_precision,
)
# Make sure we use wrappers or the correct classes depending on the installed ragas version
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.embeddings import Embeddings

# Sample test dataset (questions about MMU and assumed ground truths)
test_data = [
    {
        "question": "What are the requirements to apply for a scholarship at Multimedia University?",
        "ground_truth": "The requirements depend on the specific scholarship, but generally involve strong academic performance and sometimes extracurricular involvement or financial need. You should check the official MMU website for detailed criteria.",
    },
    {
        "question": "Where is Multimedia University located?",
        "ground_truth": "Multimedia University has two main campuses in Malaysia, located in Cyberjaya and Melaka.",
    },
    {
        "question": "What courses does MMU offer?",
        "ground_truth": "MMU offers a wide range of undergraduate and postgraduate courses in fields like Engineering, Computing, Business, Cinematic Arts, Creative Multimedia, and Law.",
    },
    {
        "question": "When was Multimedia University established?",
        "ground_truth": "Multimedia University was originally established in 1996 as Universiti Telekom before being rebranded to Multimedia University (MMU) in 1999.",
    },
    {
        "question": "Is MMU a private or public university?",
        "ground_truth": "Multimedia University (MMU) is a private university in Malaysia. It is a government-linked university owned by Telekom Malaysia (TM).",
    },
    {
        "question": "What facilities are available at the MMU Cyberjaya campus?",
        "ground_truth": "The MMU Cyberjaya campus provides various facilities including a comprehensive library (Siti Hasmah Digital Library), sports complexes, student centers, engineering and computing labs, and on-campus accommodation.",
    },
    {
        "question": "Does MMU offer distance learning or online programs?",
        "ground_truth": "Yes, MMU offers distance learning and online programs through its Online Distance Learning (ODL) initiatives and MMU Cnergy.",
    },
    {
        "question": "Who is the president of Multimedia University?",
        "ground_truth": "Prof. Dato' Dr. Mazliham Mohd Su'ud is the President of Multimedia University.",
    },
    {
        "question": "How do I contact the MMU admission office?",
        "ground_truth": "You can contact the MMU admission office via their official website's inquiry form, by calling their hotline (1300-800-668), or by emailing their prospective student department.",
    },
    {
        "question": "What is the ranking of MMU in Malaysia?",
        "ground_truth": "MMU is consistently ranked among the top private universities in Malaysia, particularly well-regarded for its IT, Computing, and Engineering programs in various global and national university rankings.",
    }
]

models_to_evaluate = ["phi3", "mistral", "llama3.1"]

def main():
    print("Starting LLM Evaluation using RAGAS...")
    results_list = []

    # Prepare datasets for each model
    model_datasets = {}

    for model in models_to_evaluate:
        print(f"\nEvaluating Model: {model}")
        questions = []
        answers = []
        contexts_list = []
        ground_truths = []
        generation_times = []

        for idx, item in enumerate(test_data):
            q = item["question"]
            gt = item["ground_truth"]
            print(f"  [{idx+1}/{len(test_data)}] Question: {q}")
            
            # Query the RAG API
            start_time = time.time()
            try:
                response = rag_query(q, n_results=3, model=model)
                answer = response.answer
                context = response.context
                sources = response.sources
            except Exception as e:
                print(f"    Error querying model {model}: {e}")
                answer = "Error generating response"
                context = ""
                sources = []
            end_time = time.time()
            
            gen_time = end_time - start_time
            
            questions.append(q)
            answers.append(answer)
            # Ragas expects contexts as list of strings
            # response.context is a single string joined by \n\n, so we split it
            contexts_list.append(context.split("\n\n") if context else [])
            ground_truths.append(gt)
            generation_times.append(gen_time)
            
            print(f"    Generation Time: {gen_time:.2f}s")
            
            # Save basic stats
            results_list.append({
                "model": model,
                "question": q,
                "generation_time": gen_time,
                "answer": answer,
            })
            
        dataset_dict = {
            "question": questions,
            "answer": answers,
            "contexts": contexts_list,
            "ground_truth": ground_truths
        }
        
        ds = Dataset.from_dict(dataset_dict)
        model_datasets[model] = ds

    print("\n--- Running Ragas Evaluation ---")
    
    # Initialize Local Evaluator LLM and Embeddings
    try:
        evaluator_llm = ChatOllama(model="llama3.1")
        evaluator_embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Configure Ragas to use our local LLM and Embeddings
        metrics = [
            answer_relevancy,
            faithfulness,
            context_recall,
            context_precision,
        ]
        
        for model, ds in model_datasets.items():
            print(f"\nRunning metrics for {model}...")
            # Note: newer ragas versions might need `llm=evaluator_llm`
            # We try using the standard `evaluate` method. 
            # If `llm` and `embeddings` are required as specific wrapper classes, it will fail, 
            # but usually Langchain base classes are supported directly.
            try:
                evaluation_result = evaluate(
                    dataset=ds,
                    metrics=metrics,
                    llm=evaluator_llm,
                    embeddings=evaluator_embeddings,
                    is_async=False # Sync for local ollama
                )
                
                eval_df = evaluation_result.to_pandas()
                # Merge the RAGAS metrics into our results_list
                for idx, row in eval_df.iterrows():
                    # Find the matching entry in results_list
                    for res in results_list:
                        if res["model"] == model and res["question"] == row["question"]:
                            res["answer_relevancy"] = row.get("answer_relevancy", None)
                            res["faithfulness"] = row.get("faithfulness", None)
                            res["context_recall"] = row.get("context_recall", None)
                            res["context_precision"] = row.get("context_precision", None)
                            break
                print(f"Successfully evaluated {model}.")
            except Exception as e:
                print(f"Error evaluating {model} with Ragas: {e}")

    except Exception as e:
        print(f"Error setting up Ragas Evaluator: {e}")
        
    print("\n--- Evaluation Summary ---")
    df_results = pd.DataFrame(results_list)
    print(df_results.to_string())
    
    output_file = "evaluation_results.csv"
    df_results.to_csv(output_file, index=False)
    print(f"\nResults saved to {output_file}")

if __name__ == "__main__":
    main()
