const client = require("../../config/dbConfig");
exports.createJob = async (req, res) => {
  try {
    const {
      hr_id,
      jobTitle,
      date,
      budget,
      skills,
      jobDescription,
      jobRoles,
      jobPerks,
      experience,
    } = req.body;

    const query = `
      INSERT INTO jobs (hr_id, title, date, budget, skills, job_description, job_responsibilities, job_perks,experience)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9)
      RETURNING *
    `;

    const values = [
      hr_id,
      jobTitle,
      date,
      budget,
      skills,
      jobDescription,
      jobRoles,
      jobPerks,
      experience,
    ];

    const result = await client.query(query, values);
    const job = result.rows[0];

    res.status(201).json({ message: "Job created successfully", job });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.saveInterviewedCandidate = async (req, res) => {
  try {
    const { user_id, hr_id, job_id } = req.body;
    const interview_date = new Date();
    // Insert the interviewed candidate into the database
    const query = `
        INSERT INTO interviewed_candidates (user_id, hr_id, job_id, interview_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
    const values = [user_id, hr_id, job_id, interview_date];
    const result = await client.query(query, values);

    const savedInterviewedCandidate = result.rows[0];

    res.status(201).json({
      message: "Interviewed candidate saved successfully",
      interviewedCandidate: savedInterviewedCandidate,
    });
  } catch (error) {
    console.error("Error saving interviewed candidate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.saveShortlistedCandidate = async (req, res) => {
  try {
    const { user_id, hr_id, job_id } = req.body;
    const shortlist_date = new Date();
    // Insert the shortlisted candidate into the database
    const query = `
        INSERT INTO shortlisted_candidates (user_id, hr_id, job_id, shortlist_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
    const values = [user_id, hr_id, job_id, shortlist_date];
    const result = await client.query(query, values);

    const savedShortlistedCandidate = result.rows[0];

    res.status(201).json({
      message: "Shortlisted candidate saved successfully",
      shortlistedCandidate: savedShortlistedCandidate,
    });
  } catch (error) {
    console.error("Error saving shortlisted candidate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getAllJobs = async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM jobs");
    const jobs = result.rows;
    res.status(200).json({ jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};
exports.getAllHrJobs = async (req, res) => {
  try {
    const { hr_id } = req.body;

    const query = "SELECT * FROM jobs WHERE hr_id = $1";
    const result = await client.query(query, [hr_id]);

    const jobs = result.rows;

    res.status(200).json({ jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

exports.filterCandidates = async (req, res) => {
  try {
    const { skills } = req.body;

    const formattedSkills = skills.map((badge) => badge.toLowerCase()); // or .toUpperCase() if needed

    const query = `
      SELECT *
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY u.id, b.assigned_date DESC) AS rn
        FROM users u
        LEFT JOIN skills s ON u.id = s.user_id
        LEFT JOIN education e ON u.id = e.user_id
        LEFT JOIN experience x ON u.id = x.user_id
        LEFT JOIN preferences p ON u.id = p.user_id
        LEFT JOIN badges b ON u.id = b.user_id
        WHERE exists (
          SELECT 1
          FROM unnest(badge_list) badge
          WHERE lower(badge) = any($1) -- or upper(badge) = any($1) if needed
        )
      ) AS subquery
      WHERE rn = 1`;
    const result = await client.query(query, [formattedSkills]);

    const usersWithDetails = result.rows;

    res.json({
      message: "Filtered candidates with details fetched successfully",
      data: usersWithDetails,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error fetching filtered candidates with details" });
  }
};

exports.getShortlistedJobs = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Fetch the job IDs for which the student has been shortlisted
    const query = `
      SELECT job_id
      FROM shortlisted_candidates
      WHERE user_id = $1`;
    const result = await client.query(query, [user_id]);
    const jobIds = result.rows.map((row) => row.job_id);

    // Fetch the job details for the shortlisted jobs
    const jobsQuery = `
      SELECT *
      FROM jobs
      WHERE id = ANY($1)`;
    const jobsResult = await client.query(jobsQuery, [jobIds]);
    const shortlistedJobs = jobsResult.rows;

    res.json({
      message: "Shortlisted jobs fetched successfully",
      data: shortlistedJobs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching shortlisted jobs" });
  }
};
