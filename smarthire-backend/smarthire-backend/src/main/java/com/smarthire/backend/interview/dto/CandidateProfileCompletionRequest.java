package com.smarthire.backend.interview.dto;

import java.util.ArrayList;
import java.util.List;

public class CandidateProfileCompletionRequest {

    private Integer completionPercentage;
    private List<String> checklist = new ArrayList<>();
    private List<String> missingItems = new ArrayList<>();

    public Integer getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(Integer completionPercentage) {
        this.completionPercentage = completionPercentage;
    }

    public List<String> getChecklist() {
        return checklist;
    }

    public void setChecklist(List<String> checklist) {
        this.checklist = checklist;
    }

    public List<String> getMissingItems() {
        return missingItems;
    }

    public void setMissingItems(List<String> missingItems) {
        this.missingItems = missingItems;
    }
}
