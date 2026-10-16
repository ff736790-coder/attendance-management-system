package com.example.attendance.model;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Attendance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String studentName;
    private String rollNumber;
    private LocalDate attendanceDate;
    private String status;

    public Attendance() {}
    public Long getId() { return id; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String v) { studentName = v; }
    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String v) { rollNumber = v; }
    public LocalDate getAttendanceDate() { return attendanceDate; }
    public void setAttendanceDate(LocalDate v) { attendanceDate = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }
}
