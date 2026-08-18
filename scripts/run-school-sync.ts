import { runSchoolSync } from "../src/server/school-sync";

runSchoolSync()
  .then((result) => {
    console.log(result);
    if (!result.ok) process.exit(1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
