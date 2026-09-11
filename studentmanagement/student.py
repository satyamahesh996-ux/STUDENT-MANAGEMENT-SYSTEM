
from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)

DATABASE = "students.db"


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


# =========================================================
# INITIALIZE DATABASE
# =========================================================

def init_db():

    conn = get_db_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            age INTEGER,
            gender TEXT,
            department TEXT,
            year TEXT,
            email TEXT,
            phone TEXT
        )
    """)

    conn.commit()
    conn.close()


# =========================================================
# MAIN PAGE
# =========================================================

@app.route("/")
def index():
    return render_template("index.html")


# =========================================================
# GET ALL STUDENTS
# =========================================================

@app.route("/api/students", methods=["GET"])
def get_students():

    conn = get_db_connection()

    students = conn.execute("""
        SELECT * FROM students
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    return jsonify([dict(student) for student in students])


# =========================================================
# GET SINGLE STUDENT
# =========================================================

@app.route("/api/students/<int:student_id>", methods=["GET"])
def get_student(student_id):

    conn = get_db_connection()

    student = conn.execute("""
        SELECT * FROM students
        WHERE id = ?
    """, (student_id,)).fetchone()

    conn.close()

    if student is None:
        return jsonify({"error": "Student not found"}), 404

    return jsonify(dict(student))


# =========================================================
# ADD STUDENT
# =========================================================

@app.route("/api/students", methods=["POST"])
def add_student():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "No data received"
        }), 400

    student_id = data.get("student_id", "").strip()
    name = data.get("name", "").strip()

    if not student_id or not name:
        return jsonify({
            "error": "Student ID and Name are required"
        }), 400

    try:

        conn = get_db_connection()

        conn.execute("""
            INSERT INTO students
            (
                student_id,
                name,
                age,
                gender,
                department,
                year,
                email,
                phone
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            student_id,
            name,
            data.get("age"),
            data.get("gender"),
            data.get("department"),
            data.get("year"),
            data.get("email"),
            data.get("phone")
        ))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Student added successfully"
        })

    except sqlite3.IntegrityError:

        return jsonify({
            "error": "Student ID already exists"
        }), 400


# =========================================================
# UPDATE STUDENT
# =========================================================

@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "No data received"
        }), 400

    try:

        conn = get_db_connection()

        cursor = conn.execute("""
            UPDATE students
            SET
                student_id = ?,
                name = ?,
                age = ?,
                gender = ?,
                department = ?,
                year = ?,
                email = ?,
                phone = ?
            WHERE id = ?
        """, (
            data.get("student_id"),
            data.get("name"),
            data.get("age"),
            data.get("gender"),
            data.get("department"),
            data.get("year"),
            data.get("email"),
            data.get("phone"),
            student_id
        ))

        conn.commit()
        conn.close()

        if cursor.rowcount == 0:

            return jsonify({
                "error": "Student not found"
            }), 404

        return jsonify({
            "success": True,
            "message": "Student updated successfully"
        })

    except sqlite3.IntegrityError:

        return jsonify({
            "error": "Student ID already exists"
        }), 400


# =========================================================
# DELETE STUDENT
# =========================================================

@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):

    conn = get_db_connection()

    cursor = conn.execute("""
        DELETE FROM students
        WHERE id = ?
    """, (student_id,))

    conn.commit()
    conn.close()

    if cursor.rowcount == 0:

        return jsonify({
            "error": "Student not found"
        }), 404

    return jsonify({
        "success": True,
        "message": "Student deleted successfully"
    })


# =========================================================
# ACADEMIC STATISTICS
# =========================================================

@app.route("/api/academic", methods=["GET"])
def academic_data():

    conn = get_db_connection()

    students = conn.execute("""
        SELECT * FROM students
    """).fetchall()

    conn.close()

    department_data = {}
    year_data = {}

    for student in students:

        department = student["department"] or "Not Assigned"
        year = student["year"] or "Not Assigned"

        department_data[department] = \
            department_data.get(department, 0) + 1

        year_data[year] = \
            year_data.get(year, 0) + 1

    return jsonify({
        "total": len(students),
        "departments": department_data,
        "years": year_data
    })


# =========================================================
# DASHBOARD STATISTICS
# =========================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard_data():

    conn = get_db_connection()

    students = conn.execute("""
        SELECT * FROM students
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    total = len(students)

    male = sum(
        1 for student in students
        if student["gender"] == "Male"
    )

    female = sum(
        1 for student in students
        if student["gender"] == "Female"
    )

    departments = len(set(
        student["department"]
        for student in students
        if student["department"]
    ))

    return jsonify({
        "total": total,
        "male": male,
        "female": female,
        "departments": departments,
        "recent": [
            dict(student)
            for student in students[:5]
        ]
    })


# =========================================================
# CLEAR ALL STUDENTS
# =========================================================

@app.route("/api/students/clear", methods=["DELETE"])
def clear_students():

    conn = get_db_connection()

    conn.execute("DELETE FROM students")

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "All student records deleted"
    })


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    init_db()

    print("=" * 50)
    print(" STUDENT MANAGEMENT SYSTEM")
    print("=" * 50)
    print("Server running at:")
    print("http://127.0.0.1:5000")
    print("=" * 50)

    app.run(debug=True)
