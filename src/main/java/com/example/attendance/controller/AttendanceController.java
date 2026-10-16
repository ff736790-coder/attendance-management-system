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
    public List<Attendance> all() { return repository.findAll(); }
    @PostMapping
    public Attendance add(@RequestBody Attendance a) {
        a.setId(null);
        return repository.save(a);
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
