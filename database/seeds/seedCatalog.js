import { connectDatabase, disconnectDatabase } from '../../server/src/config/database.js';
import { Category } from '../../server/src/models/Category.js';
import { Skill } from '../../server/src/models/Skill.js';
import { Playlist } from '../../server/src/models/Playlist.js';
import { Video } from '../../server/src/models/Video.js';

export async function seedCatalog() {
  console.log('[Seed] Connecting to database...');
  await connectDatabase();

  console.log('[Seed] Seeding curated computing catalog...');

  // 1. Categories
  const csCat = await Category.findOneAndUpdate(
    { slug: 'computer-science-fundamentals' },
    {
      name: 'Computer Science Fundamentals',
      slug: 'computer-science-fundamentals',
      description: 'Foundational concepts in algorithms, data structures, and programming languages.',
      icon: '💻',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const webCat = await Category.findOneAndUpdate(
    { slug: 'web-backend-engineering' },
    {
      name: 'Web & Backend Engineering',
      slug: 'web-backend-engineering',
      description: 'Modern full-stack web development, frontend frameworks, and developer tooling.',
      icon: '🌐',
      order: 2,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const dataCat = await Category.findOneAndUpdate(
    { slug: 'data-science-databases' },
    {
      name: 'Data Science & Databases',
      slug: 'data-science-databases',
      description: 'Relational databases, data modeling, analytical pipelines, and BI tools.',
      icon: '📊',
      order: 3,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 2. Skills
  const dsaSkill = await Skill.findOneAndUpdate(
    { slug: 'data-structures-algorithms' },
    {
      name: 'Data Structures & Algorithms',
      slug: 'data-structures-algorithms',
      description: 'Core linear and non-linear structures, algorithmic analysis, and problem-solving techniques.',
      category: csCat._id,
      icon: '⚡',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const pythonSkill = await Skill.findOneAndUpdate(
    { slug: 'python-programming' },
    {
      name: 'Python Programming',
      slug: 'python-programming',
      description: 'Syntax, control flow, functions, OOP, and practical programming in Python.',
      category: csCat._id,
      icon: '🐍',
      order: 2,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const reactSkill = await Skill.findOneAndUpdate(
    { slug: 'react-frontend-development' },
    {
      name: 'React & Frontend Development',
      slug: 'react-frontend-development',
      description: 'Component lifecycles, hooks, state management, and modern React patterns.',
      category: webCat._id,
      icon: '⚛️',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const webFoundationsSkill = await Skill.findOneAndUpdate(
    { slug: 'web-development-foundations' },
    {
      name: 'Web Development Foundations',
      slug: 'web-development-foundations',
      description: 'Semantic HTML5 structure, CSS3 responsive styling, modern layout, and web UI design.',
      category: webCat._id,
      icon: '🎨',
      order: 2,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const gitSkill = await Skill.findOneAndUpdate(
    { slug: 'git-version-control' },
    {
      name: 'Git & Version Control',
      slug: 'git-version-control',
      description: 'Distributed version control, branching workflows, pull requests, and collaborative Git practices.',
      category: webCat._id,
      icon: '🐙',
      order: 3,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const nodeSkill = await Skill.findOneAndUpdate(
    { slug: 'nodejs-backend-engineering' },
    {
      name: 'Node.js & Backend Engineering',
      slug: 'nodejs-backend-engineering',
      description: 'Server-side JavaScript, Express framework, authentication, and REST APIs.',
      category: webCat._id,
      icon: '🟢',
      order: 4,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const sqlSkill = await Skill.findOneAndUpdate(
    { slug: 'sql-database-design' },
    {
      name: 'SQL & Database Design',
      slug: 'sql-database-design',
      description: 'Relational data modeling, ACID transactions, complex joins, and query optimization.',
      category: dataCat._id,
      icon: '🗄️',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  const dataAnalyticsSkill = await Skill.findOneAndUpdate(
    { slug: 'data-analytics-bi' },
    {
      name: 'Data Analytics & Business Intelligence',
      slug: 'data-analytics-bi',
      description: 'Data analysis, statistics, Python Pandas, Excel, Tableau, and Power BI visualization.',
      category: dataCat._id,
      icon: '📈',
      order: 2,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 3. Playlists & Videos

  // Playlist: React Hooks in Depth
  const reactPlaylist = await Playlist.findOneAndUpdate(
    { slug: 'react-hooks-in-depth' },
    {
      title: 'React Hooks in Depth',
      slug: 'react-hooks-in-depth',
      description: 'Master useState, useEffect, useCallback, and custom hooks with hands-on examples.',
      skill: reactSkill._id,
      externalYoutubePlaylistId: 'PLreact_hooks_series',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'O6P86uwfdR0' },
    {
      title: 'Introduction to React Hooks',
      slug: 'introduction-to-react-hooks',
      description: 'Learn why React Hooks were introduced and how useState simplifies state management.',
      skill: reactSkill._id,
      playlist: reactPlaylist._id,
      order: 1,
      youtubeVideoId: 'O6P86uwfdR0',
      durationSeconds: 1240,
      transcript: 'Welcome to this comprehensive tutorial on React hooks and modern component design.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: '0ZJgIjIuY7U' },
    {
      title: 'Mastering the useEffect Hook',
      slug: 'mastering-the-useeffect-hook',
      description: 'Deep dive into component lifecycle synchronization, dependency arrays, and cleanup functions.',
      skill: reactSkill._id,
      playlist: reactPlaylist._id,
      order: 2,
      youtubeVideoId: '0ZJgIjIuY7U',
      durationSeconds: 1530,
      transcript: 'In this session we examine how useEffect synchronizes React components with outside systems.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Playlist: Graph Theory & Algorithms
  const graphPlaylist = await Playlist.findOneAndUpdate(
    { slug: 'graph-theory-algorithms' },
    {
      title: 'Graph Theory & Algorithmic Traversal',
      slug: 'graph-theory-algorithms',
      description: 'Representations, BFS, DFS, shortest path algorithms, and cycle detection.',
      skill: dsaSkill._id,
      externalYoutubePlaylistId: 'PLdsa_graphs_series',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'tWVWeAqZ0WU' },
    {
      title: 'Breadth First Search (BFS) Traversal',
      slug: 'breadth-first-search-bfs-traversal',
      description: 'Queue-based level-order exploration of undirected and directed graphs.',
      skill: dsaSkill._id,
      playlist: graphPlaylist._id,
      order: 1,
      youtubeVideoId: 'tWVWeAqZ0WU',
      durationSeconds: 1100,
      transcript: 'BFS is an essential algorithm for finding the shortest path in unweighted graphs.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Playlist: Web Frontend Development (HTML & CSS)
  // User Videos #3 & #4
  const webFoundationsPlaylist = await Playlist.findOneAndUpdate(
    { slug: 'web-frontend-development-html-css' },
    {
      title: 'Web Frontend Development: HTML5 & CSS3',
      slug: 'web-frontend-development-html-css',
      description: 'Complete hands-on guide to semantic HTML tags, modern CSS styling, flexbox, and grid layouts.',
      skill: webFoundationsSkill._id,
      externalYoutubePlaylistId: 'PLD1JBnN_P5x4',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'HcOc7P5BMi4' },
    {
      title: 'HTML Tutorial for Beginners | Complete HTML with Notes & Code',
      slug: 'html-tutorial-for-beginners-complete-html-with-notes-code',
      description: 'Master HTML tags, forms, tables, semantic elements, and modern layout structure.',
      skill: webFoundationsSkill._id,
      playlist: webFoundationsPlaylist._id,
      order: 1,
      youtubeVideoId: 'HcOc7P5BMi4',
      durationSeconds: 7200,
      transcript: 'Welcome to this complete HTML tutorial covering semantic tags, forms, and page structures.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'ESnrn1kAD4E' },
    {
      title: 'CSS Tutorial for Beginners | Complete CSS with Project, Notes & Code',
      slug: 'css-tutorial-for-beginners-complete-css-with-project-notes-code',
      description: 'Complete CSS guide covering selectors, box model, flexbox, grid, animations, and responsive styling.',
      skill: webFoundationsSkill._id,
      playlist: webFoundationsPlaylist._id,
      order: 2,
      youtubeVideoId: 'ESnrn1kAD4E',
      durationSeconds: 10800,
      transcript: 'Learn modern CSS from scratch including Flexbox, CSS Grid, media queries, and hands-on projects.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Playlist: Python Programming
  // User Video #2
  const pythonPlaylist = await Playlist.findOneAndUpdate(
    { slug: 'complete-python-programming-course' },
    {
      title: 'Complete Python Programming Course',
      slug: 'complete-python-programming-course',
      description: 'Step-by-step masterclass covering Python syntax, data types, functions, and problem-solving.',
      skill: pythonSkill._id,
      externalYoutubePlaylistId: 'PLD1JBnN_P5x4',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'UrsmFxEIp5k' },
    {
      title: 'Python Tutorial For Beginners in Hindi | Complete Python Course 🔥',
      slug: 'python-tutorial-for-beginners-complete-python-course',
      description: 'Comprehensive introduction to Python programming covering variables, loops, data structures, and functions.',
      skill: pythonSkill._id,
      playlist: pythonPlaylist._id,
      order: 1,
      youtubeVideoId: 'UrsmFxEIp5k',
      durationSeconds: 14400,
      transcript: 'Learn Python programming from fundamentals to intermediate concepts with practical code examples.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Playlist: Git & GitHub Version Control
  // User Video #5
  const gitPlaylist = await Playlist.findOneAndUpdate(
    { slug: 'version-control-git-github' },
    {
      title: 'Version Control with Git & GitHub',
      slug: 'version-control-git-github',
      description: 'Essential developer workflow covering commits, branching, merging, merge conflicts, and GitHub collaboration.',
      skill: gitSkill._id,
      externalYoutubePlaylistId: 'PLD1JBnN_P5x4',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'Ez8F0nW6S-w' },
    {
      title: 'Complete Git and GitHub Tutorial for Beginners',
      slug: 'complete-git-and-github-tutorial-for-beginners',
      description: 'Learn Git commands, repository initialization, branching strategies, and team collaboration on GitHub.',
      skill: gitSkill._id,
      playlist: gitPlaylist._id,
      order: 1,
      youtubeVideoId: 'Ez8F0nW6S-w',
      durationSeconds: 4200,
      transcript: 'Master version control using Git and GitHub for seamless project management and team workflows.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Playlist: SQL & Database Mastery
  // User Video #1 & Existing SQL Video
  const sqlPlaylist = await Playlist.findOneAndUpdate(
    { slug: 'sql-relational-database-mastery' },
    {
      title: 'SQL & Relational Database Mastery',
      slug: 'sql-relational-database-mastery',
      description: 'Comprehensive journey from MySQL fundamentals to advanced indexing and query optimization.',
      skill: sqlSkill._id,
      externalYoutubePlaylistId: 'PLD1JBnN_P5x4',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'hlGoQC332VM' },
    {
      title: 'SQL - Complete Course in 3 Hours | SQL One Shot using MySQL',
      slug: 'sql-complete-course-in-3-hours-sql-one-shot-using-mysql',
      description: 'Master relational databases, SQL queries, DDL, DML, joins, subqueries, and database design using MySQL.',
      skill: sqlSkill._id,
      playlist: sqlPlaylist._id,
      order: 1,
      youtubeVideoId: 'hlGoQC332VM',
      durationSeconds: 11400,
      transcript: 'In this complete 3-hour SQL course, we cover relational database design, CRUD operations, joins, and indexing.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: '7S_tz1z_5bA' },
    {
      title: 'SQL Indexing and Query Performance',
      slug: 'sql-indexing-and-query-performance',
      description: 'Understand B-Trees, clustered vs non-clustered indexes, and query execution plans.',
      skill: sqlSkill._id,
      playlist: sqlPlaylist._id,
      order: 2,
      youtubeVideoId: '7S_tz1z_5bA',
      durationSeconds: 1840,
      transcript: 'Indexes allow relational databases to find rows significantly faster than full table scans.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Playlist: Data Science & Analytics Toolkit
  // User Videos #6, #7, #8, #9, #10
  const dataAnalyticsPlaylist = await Playlist.findOneAndUpdate(
    { slug: 'data-analytics-mastery-series' },
    {
      title: 'Data Analytics & Business Intelligence Mastery',
      slug: 'data-analytics-mastery-series',
      description: 'End-to-end data analytics curriculum spanning Excel analysis, foundational statistics, Python Pandas, Tableau, and Power BI.',
      skill: dataAnalyticsSkill._id,
      externalYoutubePlaylistId: 'PLD1JBnN_P5x4',
      order: 1,
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'SA_SDo-cqpg' },
    {
      title: 'Excel Full Course for Data Analysis with Projects [ 2 Hours] | Excel Tutorial 2025',
      slug: 'excel-full-course-for-data-analysis-with-projects',
      description: 'Learn Excel for data analysts: PivotTables, VLOOKUP, XLOOKUP, data cleaning, and dashboard design.',
      skill: dataAnalyticsSkill._id,
      playlist: dataAnalyticsPlaylist._id,
      order: 1,
      youtubeVideoId: 'SA_SDo-cqpg',
      durationSeconds: 7200,
      transcript: 'Learn essential Excel formulas, data transformation, Pivot Tables, and analytical charts for data analysis.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'eF7HoC-cLRM' },
    {
      title: 'Complete Statistics Course for Beginners | Data Science Tutorial',
      slug: 'complete-statistics-course-for-beginners-data-science-tutorial',
      description: 'Descriptive and inferential statistics, probability distributions, hypothesis testing, and regression analysis for data science.',
      skill: dataAnalyticsSkill._id,
      playlist: dataAnalyticsPlaylist._id,
      order: 2,
      youtubeVideoId: 'eF7HoC-cLRM',
      durationSeconds: 10800,
      transcript: 'Statistical foundations for data science, covering mean, variance, normal distributions, and p-values.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'oiCppYglBIU' },
    {
      title: 'PANDAS Full Course with PRACTICAL (2024) | Learn Python Pandas in 1 Hour',
      slug: 'pandas-full-course-with-practical-learn-python-pandas',
      description: 'Data manipulation and analysis using Python Pandas: DataFrames, series, indexing, filtering, and aggregation.',
      skill: dataAnalyticsSkill._id,
      playlist: dataAnalyticsPlaylist._id,
      order: 3,
      youtubeVideoId: 'oiCppYglBIU',
      durationSeconds: 3600,
      transcript: 'Fast-paced hands-on tutorial mastering Pandas DataFrames, data cleaning, and statistical transformations.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'GbszEsOY3wo' },
    {
      title: 'Tableau Full Course with Project – Master Data Visualization in 3 Hours',
      slug: 'tableau-full-course-with-project-master-data-visualization',
      description: 'Build interactive dashboards, visual analytics, charts, and maps using Tableau Desktop.',
      skill: dataAnalyticsSkill._id,
      playlist: dataAnalyticsPlaylist._id,
      order: 4,
      youtubeVideoId: 'GbszEsOY3wo',
      durationSeconds: 10800,
      transcript: 'Tableau tutorial from beginner basics to building professional business intelligence dashboards.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Video.findOneAndUpdate(
    { youtubeVideoId: 'tw7bPbyy_mY' },
    {
      title: 'Power BI Full Course FREE (2026) | Business Intelligence Masterclass',
      slug: 'power-bi-full-course-business-intelligence-masterclass',
      description: 'Power BI end-to-end: Power Query ETL, DAX expressions, data modeling, and enterprise reporting dashboards.',
      skill: dataAnalyticsSkill._id,
      playlist: dataAnalyticsPlaylist._id,
      order: 5,
      youtubeVideoId: 'tw7bPbyy_mY',
      durationSeconds: 12600,
      transcript: 'Comprehensive Power BI course covering data loading, DAX formulas, interactive visuals, and report sharing.',
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );

  console.log('[Seed] Curated catalog with user videos seeded successfully.');
}

// Allow direct CLI execution: node src/seeds/seedCatalog.js
if (process.argv[1] && process.argv[1].endsWith('seedCatalog.js')) {
  seedCatalog()
    .then(() => disconnectDatabase())
    .catch((err) => {
      console.error('[Seed] Error seeding catalog:', err);
      process.exit(1);
    });
}

export default seedCatalog;
