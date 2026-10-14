package com.ithw.service.impl;

import com.ithw.dao.BookDao;
import com.ithw.dto.*;
import com.ithw.exception.BusinessException;
import com.ithw.pojo.*;
import com.ithw.service.BookService;
import com.ithw.vo.*;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BookServiceImpl implements BookService {
    private BookDao bookDao;
    public BookServiceImpl(BookDao bookDao){
        this.bookDao = bookDao;
    }

    @Override
    public List<Category> categories() {
        return  bookDao.categories();
    }

    @Override
    public List<Publisher> publishers() {
        return  bookDao.publishers();
    }

    @Override
    public BookVo bookList(BookDto bookDto) {
        if (bookDto.getPage() == null || bookDto.getPage() < 1) bookDto.setPage(1);
        if (bookDto.getSize() == null || bookDto.getSize() < 1) bookDto.setSize(15);
        if (bookDto.getSize() > 50) bookDto.setSize(50);
        bookDto.setOffset((bookDto.getPage()-1)*bookDto.getSize());

        BookVo bookVo = new BookVo();
        bookVo.setTotal(bookDao.getTotal(bookDto));
        bookVo.setPage(bookDto.getPage());
        bookVo.setSize(bookDto.getSize());
        bookVo.setList(bookDao.bookList(bookDto));
        return bookVo;
    }

    @Override
    public BookByIDVo getBookById(Integer id) {
        BookByIDVo dbbookvo = bookDao.getBookById(id);
        if (dbbookvo == null) {
            throw new BusinessException(ResultCode.RESOURCE_NOT_FOUND,ResultCode.RESOURCE_NOT_FOUND_MSG);
        }
        dbbookvo.setCopies(bookDao.getBookCopy(id));
        return dbbookvo;
    }

    @Override
    public List<BookTop> getHot() {
        return bookDao.getHot();
    }

    @Transactional
    @Override
    public BorrowBook borrowBook(BorrowBookDto borrowBookDto, User user) {
        if (borrowBookDto == null || borrowBookDto.getBookId()==null){
            throw new BusinessException(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        if (bookDao.countBorrowingByReader(user.getId())>=user.getMaxBorrow()){
            throw new BusinessException(ResultCode.BORROW_UPPER_LIMIT,ResultCode.BORROW_UPPER_LIMIT_MSG);
        }
        if (bookDao.countOverdueByReader(user.getId())>0){
            throw new BusinessException(ResultCode.HAS_OVERDUE,ResultCode.HAS_OVERDUE_MSG);
        }
        Integer copyId = bookDao.findAvailableCopyId(borrowBookDto.getBookId());
        if (copyId == null) {
            throw new BusinessException(ResultCode.BOOK_NO_COPY_AVAILABLE,ResultCode.BOOK_NO_COPY_AVAILABLE_MSG);
        }
        if(bookDao.markCopyBorrowed(copyId) == 0){
            throw new BusinessException(ResultCode.BOOK_NO_COPY_AVAILABLE,ResultCode.BOOK_NO_COPY_AVAILABLE_MSG);
        }
        // 第 5 步：插借阅记录（时间只在这里产生一次，别和 SQL 里的 NOW() 混用）
        LocalDateTime now = LocalDateTime.now();
        BorrowRecord record = new BorrowRecord();
        record.setReaderId(user.getId());
        record.setCopyId(copyId);
        record.setBorrowDate(now);
        record.setDueDate(now.plusDays(30));
        record.setStatus("borrowed");
        record.setRenewCount(0);
        bookDao.insertBorrowRecord(record);   // 执行完 record.getId() 已经有值了

        // 第 6 步：装回执
        return new BorrowBook(record.getId(), record.getDueDate());

    }

    @Override
    public BorrowingHistoryVo borrowHistory(BorrowBookList bookList, User user) {
        if(bookList.getSize() == null || bookList.getSize()< 1) bookList.setSize(10);
        if(bookList.getPage() == null || bookList.getPage()< 1) bookList.setPage(1);
        if (bookList.getSize()>50) bookList.setSize(50);
        Integer readerId = "reader".equals(user.getRole())?user.getId():null;
        Integer offset = (bookList.getPage() - 1) * bookList.getSize();
        List<BorrowingHistoryList> borrowingHistoryList = bookDao.borrowHistory(bookList,offset,readerId);
        LocalDateTime now = LocalDateTime.now();

        for (BorrowingHistoryList item : borrowingHistoryList) {
            boolean overdue = "borrowed".equals(item.getStatus())
                    && item.getReturnDate() == null
                    && now.isAfter(item.getDueDate());
            item.setOverdue(overdue);
            item.setOverdueDays(overdue ? (int) Duration.between(item.getDueDate(), now).toDays() : 0);
        }
        BorrowingHistoryVo borrowingHistoryVo = new BorrowingHistoryVo();
        borrowingHistoryVo.setList(borrowingHistoryList);
        borrowingHistoryVo.setPage(bookList.getPage());
        borrowingHistoryVo.setSize(bookList.getSize());
        borrowingHistoryVo.setTotal(bookDao.getBorrowHistory(bookList,readerId));
        return borrowingHistoryVo;
    }

    @Override
    public BorrowsSummaryList borrowsSummary(User user) {
        if (!user.getRole().trim().equals("reader")){
            throw new BusinessException(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        return bookDao.borrowsSummary(user.getId());
    }

    @Transactional
    @Override
    public ReturnBookVo returnBook(Integer id, User user) {
        BorrowRecord borrowRecord = bookDao.selectBorrowBook(id);
        if (user.getRole().trim().equals("reader") && !user.getId().equals(borrowRecord.getReaderId())) {
            throw new BusinessException(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        if (borrowRecord == null) {
            throw new BusinessException(ResultCode.RESOURCE_NOT_FOUND, ResultCode.RESOURCE_NOT_FOUND_MSG);
        }
        if (borrowRecord.getStatus().equals("returned")) {
            throw new BusinessException(ResultCode.ALREADY_RETURN, ResultCode.ALREADY_RETURN_MSG);
        }
        bookDao.updateBorrowRecord(id);
        bookDao.updateBookCopy(borrowRecord.getCopyId());
        int between = 0;
        BigDecimal multiply = BigDecimal.ZERO;
        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(borrowRecord.getDueDate())) {
            between = (int) Duration.between(borrowRecord.getDueDate(), now).toDays();
            if (between > 20) between = 20;
            multiply = new BigDecimal(between).multiply(new BigDecimal("0.5"));
            bookDao.insertFine(borrowRecord.getId(), borrowRecord.getReaderId(), multiply, "逾期" + between + "天", 0);
        }
        return new ReturnBookVo(between, multiply);
    }

    @Override
    public RenewBookVo renewBook(Integer id,User user) {
        BorrowRecord borrowRecord = bookDao.selectBorrowBook(id);
        if (borrowRecord == null){
            throw new BusinessException(ResultCode.RESOURCE_NOT_FOUND,ResultCode.RESOURCE_NOT_FOUND_MSG);
        }
        if (user.getRole().trim().equals("reader") && !user.getId().equals(borrowRecord.getReaderId())) {
            throw new BusinessException(ResultCode.FORBIDDEN,ResultCode.FORBIDDEN_MSG);
        }
        if (borrowRecord.getStatus().equals("returned")) {
            throw new BusinessException(ResultCode.ALREADY_RETURN, ResultCode.ALREADY_RETURN_MSG);
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(borrowRecord.getDueDate())) {
            throw new BusinessException(ResultCode.HAS_OVERDUE,ResultCode.HAS_OVERDUE_MSG);
        }
        if (borrowRecord.getRenewCount()>=2){
            throw new BusinessException(ResultCode.RENEW_COUNT_EXCEED,ResultCode.RENEW_COUNT_EXCEED_MSG);
        }
        int row = bookDao.updateRenew(borrowRecord.getId());
        if (row == 0) {
            throw new BusinessException(ResultCode.RENEW_COUNT_EXCEED,ResultCode.RENEW_COUNT_EXCEED_MSG);
        }
        return bookDao.newDueDate(borrowRecord.getId());
    }

    @Transactional
    @Override
    public InsertBookVo insertBook(InsertBookDto book, User user) {
        if(book.getTitle()==null||
                book.getAuthor()==null||
                book.getIsbn()==null||
                book.getCategoryId()==null||
                book.getPublisherId()==null){
            throw new BusinessException(ResultCode.EMPTY_PARAMETER,ResultCode.EMPTY_PARAMETER_MSG);
        }
        if (book.getCopyCount() > 1 && book.getCopyCount() > 20){
            throw new BusinessException(ResultCode.PARAM_ERROR,ResultCode.PARAM_ERROR_MSG);
        }
        Book entity = new Book();
        BeanUtils.copyProperties(book, entity);      // org.springframework.beans.BeanUtils
        int row = bookDao.insertBook(entity);// keyProperty="id" 回写到 entity
        Integer bookId = entity.getId();            // ✅ 这就是 book_copy.book_id
        if (row == 0) {
            throw new BusinessException(ResultCode.EMPTY_PARAMETER,ResultCode.EMPTY_PARAMETER_MSG);
        }
        int count = bookDao.countCopyBook(bookId);
        for (int i = 1; i <= book.getCopyCount(); i++) {
            String barcode = String.format("BC%04d%02d", bookId, count + i);
            bookDao.insertBookCopy(bookId, barcode);
        }
        return new InsertBookVo(bookId,book.getCopyCount());
    }

    @Transactional
    @Override
    public void update(Integer id, InsertBookDto book) {
        if(book.getTitle()==null||
                book.getAuthor()==null||
                book.getIsbn()==null||
                book.getCategoryId()==null||
                book.getPublisherId()==null){
            throw new BusinessException(ResultCode.EMPTY_PARAMETER,ResultCode.EMPTY_PARAMETER_MSG);
        }
        BookByIDVo bookById = bookDao.getBookById(id);
        if (bookById==null){
            throw new BusinessException(ResultCode.RESOURCE_NOT_FOUND,ResultCode.RESOURCE_NOT_FOUND_MSG);
        }
        bookDao.updateBook(id,book);
    }


    @Transactional
    @Override
    public void deleteById(Integer id) {
        BookByIDVo bookById = bookDao.getBookById(id);
        if (bookById==null){
            throw new BusinessException(ResultCode.RESOURCE_NOT_FOUND,ResultCode.RESOURCE_NOT_FOUND_MSG);
        }
        Integer borrowed = bookDao.borrowed(id);
        if (borrowed>0){
            throw new BusinessException(ResultCode.BOOK_CANNOT_DELETE,ResultCode.BOOK_CANNOT_DELETE_MSG);
        }
        bookDao.deleteBookCopy(id);
        bookDao.deleteBook(id);
    }

    @Override
    public BorrowRecordVo getBorrowRecord(BorrowRecordDto borrowRecordDto) {
        if(borrowRecordDto.getSize() == null || borrowRecordDto.getSize()< 1) borrowRecordDto.setSize(10);
        if(borrowRecordDto.getPage() == null || borrowRecordDto.getPage()< 1) borrowRecordDto.setPage(1);
        if (borrowRecordDto.getSize()>50) borrowRecordDto.setSize(50);
        Integer offset = (borrowRecordDto.getPage() - 1) * borrowRecordDto.getSize();
        List<BorrowRecordList> borrowRecordLists = bookDao.getBorrowRecord(borrowRecordDto,offset);
        LocalDateTime now = LocalDateTime.now();

        for (BorrowRecordList item : borrowRecordLists) {
            boolean overdue = "borrowed".equals(item.getStatus())
                    && item.getReturnDate() == null
                    && now.isAfter(item.getDueDate());
            item.setOverdue(overdue);
            item.setOverdueDays(overdue ? (int) Duration.between(item.getDueDate(), now).toDays() : 0);
        }
        BorrowRecordVo borrowRecordVo = new BorrowRecordVo();
        int total = bookDao.borrowRecordTotal(borrowRecordDto);
        borrowRecordVo.setList(borrowRecordLists);
        borrowRecordVo.setSize(borrowRecordDto.getSize());
        borrowRecordVo.setPage(borrowRecordDto.getPage());
        borrowRecordVo.setTotal(total);
        return borrowRecordVo;
    }

    @Override
    public StatsDashboardVo statsDashboard() {
        StatsDashboardVo dbstatsDashboardVo = bookDao.statsDashboard();
        dbstatsDashboardVo.setCategoryStats(bookDao.categoryStats());
        dbstatsDashboardVo.setMonthlyStats(bookDao.monthlyStats());
        return dbstatsDashboardVo;
    }


}
