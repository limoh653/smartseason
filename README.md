# 🌱 SmartSeason Field Monitoring System

Welcome to **SmartSeason**! This application helps farm administrators and field agents track the lifecycle and status of various crop fields. It provides a simple dashboard to monitor what's planted, who is managing it, and if any crops need urgent attention.

---

## 🚀 How to Run the Application Locally

SmartSeason is split into two parts: a **Backend** (the server and database) and a **Frontend** (the user interface). You need to run both to use the app.

### Prerequisites
Make sure you have the following installed on your computer:
- [Python 3](https://www.python.org/downloads/) (for the backend)
- [Node.js and npm](https://nodejs.org/) (for the frontend)

### Step 1: Start the Backend (Server)
0. clone the project from github
    ```bash
    git clone https://github.com/limoh653/smartseason.git
    ```
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: It is highly recommended to do this inside a Python virtual environment).*
3. Run the database migrations to set up your local database:
   ```bash
   python manage.py migrate
   ```
4. Start the backend server:
   ```bash
   python manage.py runserver
   ```
   The backend is now running at `http://localhost:8000`. Keep this terminal window open!

### Step 2: Start the Frontend (User Interface)
1. Open a **new** terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install the required Node packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and go to the link provided in your terminal (usually `http://localhost:5173`). 

You're all set! You can now log in and use SmartSeason.

---

## 📊 How Field Status is Determined

Every field in the system is automatically assigned a **Status** to help you quickly identify crops that need attention. Here is how the system decides what status to show:

-  **Completed** 
  A field is marked as "Completed" as soon as the field agent updates the crop's lifecycle stage to **Harvested**. 

- ⚠️ **At Risk**
  A field is flagged as "At Risk" if **more than 90 days** have passed since the planting date, AND the crop is still only in the "Planted" or "Growing" stage. This tells administrators that the crop might be overdue for harvesting or experiencing growth delays.

- 🌿 **Active**
  If a field has not been harvested yet, and is still within the normal 90-day growing window (or is marked as "Ready" to be harvested), it is considered "Active" and progressing normally.

  ## testing credentials
  Username: admin
  Password: admin123

  Username: user1  Password: user123

   username : user2  Password: user456S