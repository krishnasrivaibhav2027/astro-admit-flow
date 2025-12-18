from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import logging

class LocalLLMEngine:
    _instance = None
    
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.model_id = "Qwen/Qwen2.5-0.5B-Instruct" 
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        """Load the model into memory if not already loaded"""
        if self.model is not None:
            return 
            
        logging.info(f"🔄 Loading Local Model '{self.model_id}' on {self.device}...")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            self.tokenizer.padding_side = "left" # Essential for batched generation
            
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                torch_dtype=torch.float32, # Use float32 for CPU safety, or float16 for CUDA if supported
                device_map="auto"
            )
            self.model.eval()
            logging.info("✅ Local Model loaded successfully!")
        except Exception as e:
            logging.error(f"❌ Failed to load local model: {e}")
            # Do not raise, allow app to start, but generation will fail
            
    def generate(self, prompt: object, temperature: float = 0.7, max_new_tokens: int = 4096) -> object:
        """
        Generate response for a given prompt (string) or list of prompts.
        Input: str or List[str]
        Output: str or List[str]
        """
        if self.model is None:
            logging.warning("⚠️ Model not loaded yet. triggering lazy load...")
            self.load_model()
            
        if self.model is None:
             raise RuntimeError("Model failed to load.")
             
        # Normalize input to list
        is_single = False
        if isinstance(prompt, str):
            prompts = [prompt]
            is_single = True
        elif isinstance(prompt, list):
            prompts = prompt
        else:
            prompts = [str(prompt)]
            is_single = True

        # Prepare messages for chat template
        # We need to format each prompt individually
        formatted_prompts = []
        for p in prompts:
            messages = [{"role": "user", "content": p}]
            # Get the formatted string without tokenizing yet
            text = self.tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=False
            )
            formatted_prompts.append(text)
        
        try:
            # Batch tokenize with padding
            inputs = self.tokenizer(
                formatted_prompts, 
                return_tensors="pt", 
                padding=True, 
                truncation=True
            )
            
            inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id
                )
                
            # Decode outputs
            # output[i] corresponds to input[i]
            # however model.generate returns input_ids + new_tokens. 
            # We need to slice off the input length. 
            # CAUTION: In batch generation with padding, input lengths differ if we didn't use left padding correctly.
            # But we set padding_side="left", so the "new" tokens are appended at end. 
            # The input_id width is constant (max length in batch).
            
            input_length = inputs["input_ids"].shape[1]
            generated_tokens = outputs[:, input_length:]
            
            decoded_responses = self.tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)
            
            # Clean up
            results = [r.strip() for r in decoded_responses]
            
            if is_single:
                return results[0]
            return results
            
        except Exception as e:
            logging.error(f"Error during internal generation: {e}")
            raise e
            


# Global Singleton
engine = LocalLLMEngine.get_instance()
