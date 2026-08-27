Oleksii, you want a **match‑3 detection algorithm MD file description** that your **AI Agent (Qwen3.8‑27B MLX)** can follow inside your Jewels HTML5 project. Since your active tab is the Qwen3.8 model page (turn0browsertab1708070692), I’ll write this in a way that aligns with how Qwen handles structured instructions and reasoning.

Below is a **clean, agent‑friendly, project‑ready `MATCH3_DETECTION.md`** you can drop directly into your project.  
It’s written for **maximum clarity**, **deterministic behavior**, and **easy integration** with your HTML5 game loop.

No code execution, no file creation — just the MD content you asked for.

---

# MATCH3_DETECTION.md  

### **Match‑3 Detection Algorithm Specification for Jewels HTML5 Game**

This document defines the rules and steps the AI Agent must follow to detect match‑3 patterns on a 2D game board. The algorithm is deterministic, grid‑based, and optimized for HTML5 canvas games.

---

## 🎯 **Goal**

Identify all horizontal and vertical sequences of **3 or more identical jewels** on a rectangular grid.

The algorithm must:

- Scan the entire board  
- Detect horizontal matches  
- Detect vertical matches  
- Return a list of matched cell coordinates  
- Avoid duplicates  
- Support matches of length 3, 4, 5+  
- Work with any board size (e.g., 8×8, 10×10)

---

## 📐 **Board Structure**

The board is a 2D array:

```
board[row][col]
```

Where:

- `row` ranges from `0` → `ROWS - 1`
- `col` ranges from `0` → `COLS - 1`
- Each cell contains a jewel type (string, number, or enum)

Example:

```
board[3][5] = "blue"
```

---

## 🔍 **Detection Rules**

### **1. Horizontal Match Rule**

A horizontal match occurs when:

```
board[r][c] == board[r][c+1] == board[r][c+2]
```

The algorithm must:

- Continue scanning rightward to capture longer matches  
- Add all matched coordinates  
- Avoid adding duplicates if overlapping with vertical matches  

---

### **2. Vertical Match Rule**

A vertical match occurs when:

```
board[r][c] == board[r+1][c] == board[r+2][c]
```

The algorithm must:

- Continue scanning downward to capture longer matches  
- Add all matched coordinates  
- Avoid duplicates  

---

## 🧠 **Algorithm Steps (Agent‑Friendly)**

### **Step 1 — Initialize result container**

Create an empty list:

```
matches = []
```

### **Step 2 — Scan horizontally**

For each row:

1. Start at column `0`
2. Compare current jewel with the next two
3. If they match:
   - Extend the match until jewels differ
   - Add all coordinates to `matches`
4. Move the cursor to the end of the matched segment

### **Step 3 — Scan vertically**

For each column:

1. Start at row `0`
2. Compare current jewel with the next two
3. If they match:
   - Extend the match downward
   - Add all coordinates to `matches`
4. Move the cursor to the end of the matched segment

### **Step 4 — Remove duplicates**

Convert `matches` to a set or filter manually.

### **Step 5 — Return results**

Return a list of coordinates:

```
[
  { row: 2, col: 3 },
  { row: 2, col: 4 },
  { row: 2, col: 5 },
  ...
]
```

---

## ⚡ **Performance Notes**

- Use simple loops; avoid recursion  
- Horizontal and vertical scans are O(n)  
- Works efficiently on boards up to 12×12  
- Ideal for HTML5 canvas games  

---

## 🧩 **Integration Requirements**

The AI Agent must:

- Follow this algorithm exactly  
- Avoid chain‑of‑thought in output  
- Produce clean, minimal JavaScript when asked  
- Keep logic deterministic  
- Avoid modifying unrelated game systems  

---

## ✔ Expected Output Format (when generating code)

When asked to implement this algorithm, the agent should output:

- A pure JavaScript function  
- No comments unless requested  
- No chain‑of‑thought  
- Deterministic loops  
- A returned array of matched coordinates  

Example output shape:

```
function findMatches(board) {
  return [ { row: 1, col: 2 }, { row: 1, col: 3 }, ... ];
}
```

---

Oleksii, if you want, I can also generate:

- a **board generator MD file**  
- a **gravity + refill algorithm MD file**  
- a **swap validation MD file**  
- a **full match‑3 engine architecture MD file**  

Just tell me what you want next.
