package com.ithw.dao;

import com.ithw.dto.BookDto;
import com.ithw.dto.BorrowBookList;
import com.ithw.dto.BorrowRecordDto;
import com.ithw.dto.InsertBookDto;
import com.ithw.pojo.*;
import com.ithw.vo.*;
import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface BookDao {

    List<Category> categories();

    List<Publisher> publishers();

    List<BookItem> bookList(BookDto bookDto);

    Integer getTotal(BookDto bookDto);

    BookByIDVo getBookById(Integer id);

    List<BookCopy> getBookCopy(@Param("bookId") Integer bookId);

    List<BookTop> getHot();


    /* ==================== 2.9 借书：五个原子动作 ==================== */

    /** 第 1 步：该读者当前在借数量（命中 idx_reader_status） */
    @Select("select count(*) from borrow_record where reader_id = #{readerId} and status = 'borrowed'")
    int countBorrowingByReader(@Param("readerId") Integer readerId);

    /** 第 2 步：该读者逾期未还数量 */
    @Select("select count(*) from borrow_record where reader_id = #{readerId} and status = 'borrowed' and due_date<now()")
    int countOverdueByReader(@Param("readerId") Integer readerId);

    /** 第 3 步：挑一个 available 副本并加行锁；返回副本 id，没有可借的返回 null */
    @Select("select id from book_copy\n" +
            "        where book_id = #{bookId} and status = 'available'\n" +
            "        order by id\n" +
            "        limit 1 for update")
    Integer findAvailableCopyId(@Param("bookId") Integer bookId);

    /** 第 4 步：占住副本（带 status 条件做 CAS 兜底）；返回影响行数 */
    @Update("update book_copy\n" +
            "        set status = 'borrowed'\n" +
            "        where id = #{copyId} and status = 'available'")
    int markCopyBorrowed(@Param("copyId") Integer copyId);

    /**
     * 第 5 步：插入借阅记录；新主键回写到 record.id
     */
    @Insert("insert into borrow_record\n" +
            "            (reader_id, copy_id, borrow_date, due_date, status, renew_count)\n" +
            "        values\n" +
            "            (#{readerId}, #{copyId}, #{borrowDate}, #{dueDate}, 'borrowed', 0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertBorrowRecord(BorrowRecord record);

    List<BorrowingHistoryList> borrowHistory(@Param("bookList") BorrowBookList bookList,@Param("offset")Integer offset,@Param("readerId")Integer readerId);

    Integer getBorrowHistory(@Param("bookList") BorrowBookList bookList,
                             @Param("readerId")Integer readerId);


    BorrowsSummaryList borrowsSummary(Integer id);


    BorrowRecord selectBorrowBook(Integer id);

    void updateBorrowRecord(Integer id);

    void updateBookCopy(Integer id);

    void insertFine(@Param("record_id") Integer record_id, @Param("reader_id")Integer reader_id, @Param("amount")BigDecimal amount, @Param("reason")String reason, @Param("is_paid")Integer is_paid);

    Integer updateRenew(Integer id);

    RenewBookVo newDueDate(Integer id);

    Integer insertBook(Book book);

    @Select("select count(*) from book_copy where book_id = #{bookId}")
    Integer countCopyBook(@Param ("bookId")Integer id);

    void insertBookCopy(@Param("bookId") Integer id , @Param("barcode")String barcode);

    void updateBook(@Param("id") Integer id,@Param("book") InsertBookDto book);

    Integer borrowed(@Param("id")Integer id);

    @Delete("delete from book_copy where book_id=#{id}")
    void deleteBookCopy(@Param("id")Integer id);

    @Delete("delete from book where id=#{id}")
    void deleteBook(@Param("id")Integer id);

    List<BorrowRecordList> getBorrowRecord(@Param("borrowRecordDto") BorrowRecordDto borrowRecordDto,
                                         @Param("offset") Integer offset);

    int borrowRecordTotal(@Param("borrowRecordDto") BorrowRecordDto borrowRecordDto);

    StatsDashboardVo statsDashboard();

    List<CategoryStats> categoryStats();

    List<MonthlyStats> monthlyStats();
}


