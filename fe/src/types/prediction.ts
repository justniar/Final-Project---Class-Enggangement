export interface Prediction {
    id: number;
    userId: number; // Adjust as necessary
    expression: string;
    gender: string;
    focus: string; // This will come from your custom model
    confidence: number; // This will come from your custom model
    time: string;
  }
  