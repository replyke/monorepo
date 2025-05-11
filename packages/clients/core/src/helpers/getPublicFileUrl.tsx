const getPublicFileUrl = (path: string) => {
  if (typeof path !== "string")
    throw new Error(
      "Invalid path passed to getPublicFileUrl. Please pass a string."
    );

  return (
    "https://wthtmfriabdxsbjqbjpo.supabase.co/storage/v1/object/public/projects-storage/" +
    path
  );
};

export default getPublicFileUrl;
