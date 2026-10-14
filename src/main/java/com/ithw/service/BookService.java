package com.ithw.service;

import com.ithw.dto.*;
import com.ithw.pojo.Category;
import com.ithw.pojo.Publisher;
import com.ithw.pojo.User;
import com.ithw.vo.*;

import java.util.List;

public interface BookService {
    List<Category> categories();

    List<Publisher> publishers();

    BookVo bookList(BookDto bookDto);

    BookByIDVo getBookById(Integer id);

    List<BookTop> getHot();

    BorrowBook borrowBook(BorrowBookDto borrowBookDto, User user);

    BorrowingHistoryVo borrowHistory(BorrowBookList bookList, User user);


    BorrowsSummaryList borrowsSummary(User user);

    ReturnBookVo returnBook(Integer id, User user);

    RenewBookVo renewBook(Integer id,User user);

    InsertBookVo insertBook(InsertBookDto book, User user);

    void update(Integer id, InsertBookDto book);

    void deleteById(Integer id);

    BorrowRecordVo getBorrowRecord(BorrowRecordDto borrowRecordDto);

    StatsDashboardVo statsDashboard();
}
