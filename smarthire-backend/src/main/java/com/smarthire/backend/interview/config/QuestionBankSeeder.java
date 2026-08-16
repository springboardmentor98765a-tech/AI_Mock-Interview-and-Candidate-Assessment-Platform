package com.smarthire.backend.interview.config;

import com.smarthire.backend.interview.entity.QuestionBankQuestion;
import com.smarthire.backend.interview.repository.QuestionBankQuestionRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class QuestionBankSeeder implements ApplicationRunner {

    private final QuestionBankQuestionRepository repository;

    public QuestionBankSeeder(QuestionBankQuestionRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<QuestionBankQuestion> questions = new ArrayList<>();

        // Frontend Developer - Technical
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Web Fundamentals", "What is the difference between let, const, and var in JavaScript, and when would you use each one?");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "JavaScript", "Explain the JavaScript event loop and how promises are scheduled.");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Web Performance", "How would you diagnose and improve a slow-loading web page?");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Accessibility", "How would you make a web form accessible to keyboard and screen-reader users?");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "CSS", "Explain CSS specificity and how you would resolve conflicting styles in a maintainable way.");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "APIs", "How would you handle loading, success, empty, and error states when consuming a REST API from the frontend?");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Testing", "What would you test in a frontend application before releasing a major feature?");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Security", "What are common frontend security risks such as XSS, and how can you reduce them?");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Architecture", "How would you organize a growing frontend codebase so that features remain easy to maintain?");
        add(questions, "Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "State Management", "When would you use local component state versus shared application state?");

        // Frontend - Behavioral
        add(questions, "Frontend Developer", "Behavioral", "Frontend", "Mid", "Medium", "Teamwork", "Tell me about a time you disagreed with a teammate about an implementation approach. How did you resolve it?");
        add(questions, "Frontend Developer", "Behavioral", "Frontend", "Mid", "Medium", "Problem Solving", "Describe a production issue you handled and how you communicated the impact to your team.");
        add(questions, "Frontend Developer", "Behavioral", "Frontend", "Mid", "Medium", "Ownership", "Tell me about a feature you owned from requirements through release.");
        add(questions, "Frontend Developer", "Behavioral", "Frontend", "Mid", "Medium", "Feedback", "Describe a piece of critical feedback you received and how it improved your work.");
        add(questions, "Frontend Developer", "Behavioral", "Frontend", "Mid", "Medium", "Prioritization", "How do you handle competing frontend tasks when deadlines are tight?");

        // Java Developer - Technical
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Collections", "What is the difference between HashMap and ConcurrentHashMap, and when would you choose each?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Spring Boot", "How does dependency injection work in Spring Boot?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "REST", "How would you design a REST endpoint that validates input and returns meaningful error responses?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "JPA", "What is the difference between lazy and eager fetching in JPA, and what problems can each cause?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Transactions", "What does @Transactional do and when can transaction boundaries cause unexpected behavior?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Concurrency", "Explain the difference between synchronized, volatile, and atomic variables in Java.");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Exception Handling", "How would you design exception handling for a Spring Boot REST API?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Performance", "How would you investigate high memory usage in a Java application?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Testing", "How do unit tests and integration tests complement each other in a Spring Boot project?");
        add(questions, "Java Developer", "Technical", "Java", "Mid", "Medium", "Security", "What are common API security controls you would apply to a Spring Boot application?");

        // Data Analyst - Technical
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "SQL", "How would you find duplicate rows in a SQL table and verify which records should remain?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "SQL", "Explain the difference between INNER JOIN and LEFT JOIN with a practical example.");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Statistics", "What is the difference between correlation and causation?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Data Quality", "How would you detect and handle missing or inconsistent values in a dataset?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Dashboards", "What makes a business dashboard useful to decision makers?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Metrics", "How would you choose a KPI for measuring product engagement?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Experimentation", "How would you interpret the results of an A/B test?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Communication", "How do you explain an unexpected data trend to a non-technical stakeholder?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Modeling", "What is the purpose of normalization in a relational data model?");
        add(questions, "Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Problem Solving", "Describe a time you used data to influence a business decision.");

        // HR / Behavioral - generic
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Introduction", "Tell me about yourself and the kind of work you enjoy most.");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Motivation", "Why are you interested in this role and this kind of work?");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Teamwork", "Tell me about a time you worked with someone whose communication style was different from yours.");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Conflict", "How do you handle disagreements when the team needs to make a decision quickly?");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Leadership", "Describe a time you took ownership without being explicitly asked.");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Failure", "Tell me about a mistake you made and what you changed afterward.");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Learning", "How do you keep your technical skills current?");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Prioritization", "How do you decide what to do first when several tasks are important?");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Career Goals", "What kind of growth are you looking for in your next role?");
        add(questions, "Software Engineer", "HR", "General", "Mid", "Medium", "Communication", "How do you explain a technical problem to someone without a technical background?");

        // Seed the core bank only when empty. Existing installations are also upgraded with MCQs below.
        if (repository.count() == 0) {
            repository.saveAll(questions);
        }
        ensureMcqQuestions();
    }

    private void ensureMcqQuestions() {
        List<QuestionBankQuestion> mcqs = List.of(
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "JavaScript",
                "Which JavaScript declaration creates a block-scoped constant?", "[\"var\",\"let\",\"const\",\"function\"]", "MCQ", "const"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "React",
                "Which React hook is used to manage local component state?", "[\"useEffect\",\"useState\",\"useMemo\",\"useRef\"]", "MCQ", "useState"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Collections",
                "Which Java collection provides average O(1) key lookup?", "[\"ArrayList\",\"HashMap\",\"LinkedList\",\"TreeSet\"]", "MCQ", "HashMap"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Spring Boot",
                "Which annotation is commonly used to mark a Spring service class?", "[\"@Entity\",\"@Service\",\"@ControllerAdvice\",\"@Bean\"]", "MCQ", "@Service"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "SQL",
                "Which SQL clause filters rows before grouping?", "[\"HAVING\",\"WHERE\",\"ORDER BY\",\"GROUP BY\"]", "MCQ", "WHERE"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Web Fundamentals",
                "Which HTTP status code means the request was successful?", "[\"200\",\"301\",\"404\",\"500\"]", "MCQ", "200"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "APIs",
                "Which HTTP method is commonly used to create a new resource?", "[\"GET\",\"POST\",\"DELETE\",\"HEAD\"]", "MCQ", "POST")
        );
        // Additional role-specific MCQs so every technical interview can render 10 option-based questions.
        mcqs = new ArrayList<>(mcqs);
        mcqs.addAll(List.of(
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "HTML",
                "Which HTML element is most appropriate for the main navigation links?", "[\"nav\",\"div\",\"section\",\"footer\"]", "MCQ", "nav"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "CSS",
                "Which CSS property controls the space inside an element's border?", "[\"margin\",\"padding\",\"gap\",\"outline\"]", "MCQ", "padding"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "JavaScript",
                "Which array method creates a new array by transforming every element?", "[\"filter\",\"map\",\"find\",\"reduceRight\"]", "MCQ", "map"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "HTTP",
                "Which HTTP status indicates that a resource was not found?", "[\"200\",\"201\",\"404\",\"500\"]", "MCQ", "404"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Accessibility",
                "Which attribute provides an accessible name for an image when it cannot be seen?", "[\"title\",\"alt\",\"name\",\"label\"]", "MCQ", "alt"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "React",
                "Which React hook is commonly used for side effects?", "[\"useState\",\"useEffect\",\"useContext\",\"useId\"]", "MCQ", "useEffect"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Security",
                "Which practice most directly reduces reflected XSS risk?", "[\"Using innerHTML with user input\",\"Escaping untrusted output\",\"Disabling HTTPS\",\"Storing secrets in localStorage\"]", "MCQ", "Escaping untrusted output"),
            new QuestionBankQuestion("Frontend Developer", "Technical", "Frontend", "Mid", "Medium", "Performance",
                "Which browser feature helps defer loading images until they are near the viewport?", "[\"lazy loading\",\"prefetch\",\"blocking scripts\",\"inline CSS\"]", "MCQ", "lazy loading"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "OOP",
                "Which Java keyword prevents a class from being extended?", "[\"static\",\"final\",\"private\",\"sealedOnly\"]", "MCQ", "final"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Streams",
                "Which Stream operation transforms each element into another value?", "[\"filter\",\"map\",\"peekOnly\",\"count\"]", "MCQ", "map"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Exceptions",
                "Which block is used to execute cleanup code whether an exception occurs or not?", "[\"catch\",\"throw\",\"finally\",\"throws\"]", "MCQ", "finally"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Spring",
                "Which annotation marks a Spring Boot REST controller?", "[\"@Entity\",\"@RestController\",\"@RepositoryOnly\",\"@ConfigurationProperties\"]", "MCQ", "@RestController"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Spring",
                "Which annotation injects a bean by type in a Spring application?", "[\"@Autowired\",\"@Entity\",\"@RequestBody\",\"@ValueOnly\"]", "MCQ", "@Autowired"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "JPA",
                "Which annotation identifies the primary key field of a JPA entity?", "[\"@Column\",\"@Id\",\"@JoinColumn\",\"@Generated\"]", "MCQ", "@Id"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "REST",
                "Which HTTP status is commonly returned after successfully creating a resource?", "[\"200\",\"201\",\"204\",\"304\"]", "MCQ", "201"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Concurrency",
                "Which interface represents a task that returns a result in Java concurrency?", "[\"Runnable\",\"Callable\",\"ThreadGroup\",\"ExecutorOnly\"]", "MCQ", "Callable"),
            new QuestionBankQuestion("Java Developer", "Technical", "Java", "Mid", "Medium", "Streams",
                "Which Stream terminal operation returns the number of elements?", "[\"map\",\"filter\",\"count\",\"peek\"]", "MCQ", "count"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "SQL",
                "Which SQL keyword removes duplicate rows from a result set?", "[\"UNIQUE\",\"DISTINCT\",\"DEDUP\",\"GROUPONLY\"]", "MCQ", "DISTINCT"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "SQL",
                "Which SQL function counts rows?", "[\"SUM\",\"AVG\",\"COUNT\",\"TOTAL\"]", "MCQ", "COUNT"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Statistics",
                "What does the median represent?", "[\"Most frequent value\",\"Middle value after sorting\",\"Average of all values\",\"Largest value\"]", "MCQ", "Middle value after sorting"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Statistics",
                "What is the range of a dataset?", "[\"Mean minus median\",\"Maximum minus minimum\",\"Standard deviation squared\",\"Median divided by mean\"]", "MCQ", "Maximum minus minimum"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Data Quality",
                "Which approach is commonly used to handle missing numeric values?", "[\"Replace with a suitable statistic\",\"Always delete every row\",\"Convert to HTML\",\"Duplicate the row\"]", "MCQ", "Replace with a suitable statistic"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Visualization",
                "Which chart is generally suitable for comparing values across categories?", "[\"Bar chart\",\"Scatterless chart\",\"Gauge only\",\"Tree map only\"]", "MCQ", "Bar chart"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "Experimentation",
                "What is the main purpose of a control group in an A/B test?", "[\"Increase sample errors\",\"Provide a baseline for comparison\",\"Hide the treatment\",\"Remove randomization\"]", "MCQ", "Provide a baseline for comparison"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "SQL",
                "Which clause sorts SQL query results?", "[\"ORDER BY\",\"SORT ROWS\",\"GROUP BY\",\"ARRANGE\"]", "MCQ", "ORDER BY"),
            new QuestionBankQuestion("Data Analyst", "Technical", "Analytics", "Mid", "Medium", "SQL",
                "Which SQL join returns every row from the left table and matching rows from the right table?", "[\"INNER JOIN\",\"LEFT JOIN\",\"CROSS JOIN\",\"RIGHT ONLY\"]", "MCQ", "LEFT JOIN"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Git",
                "Which Git command creates a new commit from staged changes?", "[\"git push\",\"git commit\",\"git fetch\",\"git clone\"]", "MCQ", "git commit"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Databases",
                "Which database property ensures a transaction is all-or-nothing?", "[\"Atomicity\",\"Availability\",\"Indexing\",\"Partitioning\"]", "MCQ", "Atomicity"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "APIs",
                "Which HTTP method is generally idempotent for replacing a resource?", "[\"POST\",\"PUT\",\"PATCHONLY\",\"CONNECT\"]", "MCQ", "PUT"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Testing",
                "Which test type typically isolates a single class or function?", "[\"Unit test\",\"Load test\",\"End-to-end only\",\"Penetration test\"]", "MCQ", "Unit test"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Security",
                "Which practice is safest for storing application secrets?", "[\"Commit them to Git\",\"Use a secret manager or environment configuration\",\"Put them in HTML\",\"Put them in public CSS\"]", "MCQ", "Use a secret manager or environment configuration"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Algorithms",
                "What is the average lookup complexity of a hash table with a good hash function?", "[\"O(1)\",\"O(log n)\",\"O(n)\",\"O(n log n)\"]", "MCQ", "O(1)"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "HTTP",
                "Which status code means the server successfully processed the request with no response body required?", "[\"200\",\"201\",\"204\",\"404\"]", "MCQ", "204"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Architecture",
                "Which principle suggests a module should have one reason to change?", "[\"Single Responsibility Principle\",\"Open Door Principle\",\"First In First Out\",\"Least Data Principle\"]", "MCQ", "Single Responsibility Principle"),
            new QuestionBankQuestion("Software Engineer", "Technical", "General", "Mid", "Medium", "Networking",
                "Which protocol is commonly used for secure web traffic?", "[\"HTTP\",\"HTTPS\",\"FTP\",\"SMTP\"]", "MCQ", "HTTPS")
        ));

        List<QuestionBankQuestion> aptitude = List.of(
            new QuestionBankQuestion("Aptitude", "Aptitude", "Quantitative", "Entry", "Easy", "Percentages", "A shop gives 20% discount on a ₹500 item. What is the sale price?", "[\"₹350\",\"₹400\",\"₹450\",\"₹480\"]", "MCQ", "₹400"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Quantitative", "Entry", "Easy", "Averages", "What is the average of 10, 20 and 30?", "[\"15\",\"20\",\"25\",\"30\"]", "MCQ", "20"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Quantitative", "Entry", "Easy", "Ratios", "If A:B = 2:3 and A = 10, what is B?", "[\"12\",\"15\",\"18\",\"20\"]", "MCQ", "15"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Logical Reasoning", "Entry", "Easy", "Series", "What comes next: 2, 4, 8, 16, ?", "[\"20\",\"24\",\"32\",\"36\"]", "MCQ", "32"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Quantitative", "Entry", "Medium", "Time Work", "A can finish a job in 10 days. What fraction of the job does A finish in one day?", "[\"1/5\",\"1/10\",\"1/20\",\"10\"]", "MCQ", "1/10"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Quantitative", "Entry", "Medium", "Speed", "A car travels 120 km in 2 hours. What is its average speed?", "[\"40 km/h\",\"50 km/h\",\"60 km/h\",\"80 km/h\"]", "MCQ", "60 km/h"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Logical Reasoning", "Entry", "Medium", "Odd One Out", "Which is the odd one out?", "[\"Triangle\",\"Square\",\"Circle\",\"Rectangle\"]", "MCQ", "Circle"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Logical Reasoning", "Entry", "Medium", "Coding", "If CAT is coded as DBU, how is DOG coded using the same rule?", "[\"EPH\",\"EOG\",\"FPH\",\"DPG\"]", "MCQ", "EPH"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Quantitative", "Entry", "Hard", "Probability", "A fair coin is tossed twice. What is the probability of getting two heads?", "[\"1/2\",\"1/3\",\"1/4\",\"3/4\"]", "MCQ", "1/4"),
            new QuestionBankQuestion("Aptitude", "Aptitude", "Quantitative", "Entry", "Hard", "Profit Loss", "An item bought for ₹800 is sold for ₹920. What is the profit percentage?", "[\"10%\",\"12%\",\"15%\",\"20%\"]", "MCQ", "15%")
        );
        mcqs = new ArrayList<>(mcqs);
        mcqs.addAll(aptitude);

        List<QuestionBankQuestion> missing = new ArrayList<>();
        for (QuestionBankQuestion q : mcqs) {
            if (!repository.existsByQuestionIgnoreCase(q.getQuestion())) missing.add(q);
        }
        if (!missing.isEmpty()) repository.saveAll(missing);
    }

    private void add(List<QuestionBankQuestion> list, String role, String type, String domain,
                     String experience, String difficulty, String category, String question) {
        list.add(new QuestionBankQuestion(role, type, domain, experience, difficulty, category, question));
    }
}
