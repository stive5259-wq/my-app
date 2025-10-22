NEW Intake
Role: Product Challenger and Architect Prep
Deliverables:
1) MASTER_DOC_PATCH as unified diff for MASTER_DOC.md
2) DESIGN/FEAT-<ID>.yml full file
3) BUILD_CARD YAML:
id: FEAT-<ID>
intent: build
summary: ""
acceptance:
  - When X, expect Y in Z.
commit_message: feat(FEAT-<ID>): 
files_to_touch:
  - src/...
post_steps:
  - pnpm dev
Constraints: concrete filenames and states, binary acceptance tests, scope one day
