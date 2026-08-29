import os
import logging
from typing import List, Dict, Any, Optional
from groq import Groq
from core.config import settings

logger = logging.getLogger("hisaaby.groq")

FINANCIAL_SYSTEM_PROMPT = """You are Hisaaby Buddy, an expert AI Financial Copilot and financial document analyst.

STRICT GROUNDING & SCOPE RULES:
1. You are EXCLUSIVELY permitted to assist with personal finances, budgeting, spending habits, accounting, bank statements, invoices, receipts, and uploaded financial records.
2. If the user asks about completely unrelated non-financial topics (such as weather, coding, poetry, politics, entertainment, medical diagnosis, video games, etc.), politely refuse with:
"This is not in my rule. I am strictly dedicated to assisting you with your personal finances, budgets, bank statements, and spending analysis."
3. When the user asks conversational follow-up questions like "why", "how", "what do you mean", or asks about their uploaded documents, accounts, or ledger:
- Reference the documents, transactions, and balance provided in the context.
- Be direct, concise, and helpful.
- If the user asks how many documents are added, state the exact count and filenames from the provided context.
4. Ground all statements, metrics, and summaries directly in the provided user context and Pinecone vector records.
5. When presenting transaction lists, invoice itemizations, expenses, or financial breakdowns, ALWAYS format them in clean standard Markdown tables:
| Date | Description | Category | Amount |
|---|---|---|---|
| 21 Feb 2026 | Mouse (Qty: 1) | Office Equipment | -Rs 3,000.00 |
"""

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
                logger.info("Groq client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")

    def query_financial_assistant(
        self, 
        prompt: str, 
        user_context: Optional[Dict[str, Any]] = None,
        rag_context: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Query Groq AI with strict grounding rules and conversational history support.
        """
        if not self.client:
            raise Exception("Groq AI service is not initialized.")

        clean_lower = prompt.strip().lower()

        # Friendly financial greetings
        if clean_lower in ["hi", "hello", "hey", "good morning", "good evening", "greetings"]:
            return "Hello! I am your Hisaaby Buddy Financial Copilot. How can I assist you with your budget, bank statements, or spending today?"

        # Non-financial fast rule check (exclude conversational follow-ups like 'why')
        non_financial_triggers = [
            "write a poem", "write code", "tell a joke", 
            "weather", "president", "recipe", "cook", "movie", "football",
            "cricket", "basketball", "capital of", "translate a story", "sing a song"
        ]
        for trigger in non_financial_triggers:
            if trigger in clean_lower and not any(fin in clean_lower for fin in ["finance", "money", "budget", "spend", "account", "bank", "statement", "document", "ledger"]):
                return "This is not in my rule. I am strictly dedicated to assisting you with your personal finances, budgets, bank statements, and spending analysis."

        system_instruction = FINANCIAL_SYSTEM_PROMPT

        if rag_context:
            system_instruction += f"\n\n[USER FINANCIAL CONTEXT & PINECONE RECORDS]:\n{rag_context}\n"

        if user_context and not user_context.get("is_guest"):
            system_instruction += f"\n\n[USER IDENTITY]: {user_context.get('email', 'Authenticated User')} (UID: {user_context.get('uid')})\n"
        else:
            system_instruction += "\n\n[USER STATUS]: Active Account Session.\n"

        # Build message chain with conversation history
        messages = [{"role": "system", "content": system_instruction}]
        if chat_history:
            for msg in chat_history[-6:]:
                role = "assistant" if msg.get("sender") == "ai" or msg.get("role") == "assistant" else "user"
                content = msg.get("text") or msg.get("content") or ""
                if content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": prompt})

        # Model candidates
        candidate_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound"]
        
        last_error = None
        for model in candidate_models:
            try:
                chat_completion = self.client.chat.completions.create(
                    messages=messages,
                    model=model,
                    temperature=0.2,
                    max_tokens=600,
                )
                return chat_completion.choices[0].message.content
            except Exception as e:
                last_error = e
                logger.warning(f"Groq model {model} error: {e}, trying next candidate...")
                continue

        logger.error(f"All Groq model attempts failed. Last error: {last_error}")
        raise Exception(f"Failed to query AI copilot: {str(last_error)}")

groq_service = GroqService()
