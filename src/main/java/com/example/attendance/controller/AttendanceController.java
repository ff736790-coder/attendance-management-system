package com.example.attendance.controller;

import com.example.attendance.model.Attendance;
import com.example.attendance.repository.AttendanceRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {
    private final AttendanceRepository repository;

    public AttendanceController(AttendanceRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Attendance> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Attendance add(@RequestBody Attendance attendance) {
        if (attendance.getStudentName() == null || attendance.getStudentName().isBlank()
            || attendance.getRollNumber() == null || attendance.getRollNumber().isBlank()
            || attendance.getAttendanceDate() == null
            || attendance.getStatus() == null || attendance.getStatus().isBlank()) {
            throw new IllegalArgumentException("All fields are required");
        }
        return repository.save(attendance);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
