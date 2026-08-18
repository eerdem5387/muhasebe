import { runSchoolSync } from "../src/server/school-sync";

if (!process.env.SOURCE_DATABASE_URL?.trim()) {
  console.log("SOURCE_DATABASE_URL yok; okul senkronu atlandı.");
  process.exit(0);
}

runSchoolSync()
  .then((result) => {
    console.log(result);
    if (!result.ok) {
      console.error(result.error);
      process.exit(process.env.VERCEL ? 0 : 1);
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(process.env.VERCEL ? 0 : 1);
  });
