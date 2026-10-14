package com.ithw.controller;

import com.ithw.dto.*;
import com.ithw.pojo.*;
import com.ithw.service.BookService;
import com.ithw.vo.*;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/api")
public class BookController {
    private BookService bookService;
    public BookController(BookService bookService){
        this.bookService = bookService;
    }

    @GetMapping("/categories")
    public Result<List<Category>> categories(HttpServletRequest request){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        List<Category> dbcategory = bookService.categories();
        return Result.success(dbcategory);
    }

    @GetMapping("/publishers")
    public Result<List<Publisher>> publishers(HttpServletRequest request){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        List<Publisher> dbpublishers =  bookService.publishers();
        return Result.success(dbpublishers);
    }

    @GetMapping("/books")
    public Result<BookVo> bookList(BookDto bookDto,HttpServletRequest request){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        BookVo bookVo = bookService.bookList(bookDto);
        return Result.success(bookVo);
    }

    @GetMapping("/books/{id}")
    public Result<BookByIDVo> getBookById(@PathVariable Integer id,HttpServletRequest request){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        BookByIDVo dbbookByIDVo = bookService.getBookById(id);
        return Result.success(dbbookByIDVo);
    }

    @GetMapping("/books/hot")
    public Result<List<BookTop>> getHot(HttpServletRequest request){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        return Result.success(bookService.getHot());
    }

    @PostMapping("/borrows")
    public Result<BorrowBook> borrowBook(HttpServletRequest request,@RequestBody BorrowBookDto borrowBookDto){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        if (!"reader".equals(user.getRole())){
            return Result.fail(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        BorrowBook book1 = bookService.borrowBook(borrowBookDto,user);
        return Result.success(book1);
    }

    @GetMapping("/borrows")
    public Result<BorrowingHistoryVo> borrowHistory(BorrowBookList bookList, HttpServletRequest request){
        User user = (User)request.getAttribute("loginUser");
        if (user == null) {
            System.out.println();
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        BorrowingHistoryVo borrowingHistoryVo = bookService.borrowHistory(bookList,user);
        return Result.success(borrowingHistoryVo);
    }

    @GetMapping("/borrows/summary")
    public Result<BorrowsSummaryList>borrowsSummary(HttpServletRequest request){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        BorrowsSummaryList dbborrowsSummaryList = bookService.borrowsSummary(user);
        return Result.success(dbborrowsSummaryList);
    }

    @PutMapping("/borrows/{id}/return")
    public Result<ReturnBookVo> returnBook(@PathVariable Integer id,HttpServletRequest request){
        if (id == null) {
            return Result.fail(ResultCode.RESOURCE_NOT_FOUND,ResultCode.RESOURCE_NOT_FOUND_MSG);
        }
        User user = (User)request.getAttribute("loginUser");
        ReturnBookVo returnBookdb = bookService.returnBook(id,user);
        return Result.success(returnBookdb);
    }

    @PutMapping("/borrows/{id}/renew")
    public Result<RenewBookVo> renewBook(@PathVariable Integer id,HttpServletRequest request){
        User userLogin = (User) request.getAttribute("loginUser");
        RenewBookVo dbrenewBookVo = bookService.renewBook(id,userLogin);
        return Result.success(dbrenewBookVo);
    }

    @PostMapping("/admin/books")
    public Result<InsertBookVo> insertBook(HttpServletRequest request, @RequestBody InsertBookDto book) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        if (!user.getRole().equals("admin")) {
            return Result.fail(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        InsertBookVo insertBookVoResult = bookService.insertBook(book, user);
        return Result.success(insertBookVoResult);
    }

    @PutMapping("/admin/books/{id}")
    public Result<Void> updateBook(@PathVariable Integer id,HttpServletRequest request,@RequestBody InsertBookDto book){
        User user =(User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        if (!user.getRole().equals("admin")){
            return Result.fail(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        bookService.update(id,book);
        return Result.success();
    }

    @DeleteMapping("/admin/books/{id}")
    public Result<Void> delete(@PathVariable Integer id,HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        if (!user.getRole().equals("admin")){
            return Result.fail(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        bookService.deleteById(id);
        return Result.success();
    }

    @GetMapping("admin/borrows")
    public Result<BorrowRecordVo> getBorrowRecord(BorrowRecordDto borrowRecordDto,HttpServletRequest request) {
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        if (!user.getRole().equals("admin")){
            return Result.fail(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        BorrowRecordVo borrowRecordVo = bookService.getBorrowRecord(borrowRecordDto);

        return Result.success(borrowRecordVo);
    }

    @GetMapping("/admin/stats")
    public Result<StatsDashboardVo>statsDashboard(HttpServletRequest request){
        User user = (User) request.getAttribute("loginUser");
        if (user == null) {
            return Result.fail(ResultCode.NOT_LOGIN,ResultCode.NOT_LOGIN_MSG);
        }
        if (!user.getRole().equals("admin")){
            return Result.fail(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        StatsDashboardVo statsDashboardVo = bookService.statsDashboard();
        return Result.success(statsDashboardVo);
    }
}
