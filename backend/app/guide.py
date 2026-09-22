from pydantic import BaseModel
from typing import List, Optional

class GuideQuestion(BaseModel):
    question_id: str
    ordering: int
    question_text: str
    short_label: str
    topic: Optional[str] = None

# Based strictly on the provided interview_guide.txt
INTERVIEW_QUESTIONS = [
    GuideQuestion(
        question_id="Q1",
        ordering=1,
        question_text="How would you describe current adoption of robotic surgery in your market?",
        short_label="Current Adoption",
        topic="Adoption"
    ),
    GuideQuestion(
        question_id="Q2",
        ordering=2,
        question_text="What are the main barriers to adoption?",
        short_label="Barriers",
        topic="Barriers"
    ),
    GuideQuestion(
        question_id="Q3",
        ordering=3,
        question_text="How important are hospital budgets and ROI in purchasing decisions?",
        short_label="Budgets & ROI",
        topic="Economics"
    ),
    GuideQuestion(
        question_id="Q4",
        ordering=4,
        question_text="How important are surgeon training and clinical outcomes?",
        short_label="Training & Outcomes",
        topic="Clinical"
    ),
    GuideQuestion(
        question_id="Q5",
        ordering=5,
        question_text="What adoption trend do you expect over the next 3–5 years?",
        short_label="3-5 Year Outlook",
        topic="Trends"
    ),
    GuideQuestion(
        question_id="Q6",
        ordering=6,
        question_text="What is the typical hospital decision-making timeline for purchasing a new robotic system?",
        short_label="Purchasing Timeline",
        topic="Purchasing"
    )
]

def get_all_questions() -> List[GuideQuestion]:
    return INTERVIEW_QUESTIONS

def get_question_by_id(question_id: str) -> Optional[GuideQuestion]:
    for q in INTERVIEW_QUESTIONS:
        if q.question_id == question_id:
            return q
    return None
