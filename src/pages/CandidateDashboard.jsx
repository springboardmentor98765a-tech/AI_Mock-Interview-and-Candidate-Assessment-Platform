import Navbar from "../components/Navbar";
import DashboardCard from "../components/DashboardCard";
import "../styles/Dashboard.css";

function CandidateDashboard() {
  return (
    <>
      <Navbar />

      <div className="dashboard-container">

        <h1 className="dashboard-title">
          Welcome, Candidate 👋
        </h1>

        <div className="cards">

          <DashboardCard
            title="Total Interviews"
            value="12"
          />

          <DashboardCard
            title="Average Score"
            value="84%"
          />

          <DashboardCard
            title="Confidence"
            value="81%"
          />

          <DashboardCard
            title="Communication"
            value="88%"
          />

        </div>
        <h2 className="section-title">
  Recent Interview History
</h2>

<table className="interview-table">

  <thead>

    <tr>
      <th>Interview</th>
      <th>Date</th>
      <th>Score</th>
      <th>Status</th>
    </tr>

  </thead>

  <tbody>

    <tr>
      <td>HR Interview</td>
      <td>10 July</td>
      <td>85%</td>
      <td>Completed</td>
    </tr>

    <tr>
      <td>Java Technical</td>
      <td>14 July</td>
      <td>91%</td>
      <td>Completed</td>
    </tr>

    <tr>
      <td>DBMS Interview</td>
      <td>18 July</td>
      <td>76%</td>
      <td>Scheduled</td>
    </tr>

  </tbody>

</table>

      </div>

    </>
  );
}

export default CandidateDashboard;