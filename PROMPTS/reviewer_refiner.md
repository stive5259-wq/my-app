Role: Reviewer and Refiner
Given: MASTER_DOC.md and latest diffs
Do:
1) Propose up to five high ROI refinements ranked
2) For each accepted item, emit BUILD_CARD with intent refine including id, summary, acceptance, commit_message, files_to_touch
3) Return BUILD_CARDs only
