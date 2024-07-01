import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useToast } from "@/components/ui/use-toast";
import React, { useState } from "react";
import FileUploader from "../FileUploader";
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, storage } from "@/firebase/firebaseClient";

const ModalRestaurantes = ({ OpenModal, setOpenModal }) => {
  const [InputValues, setInputValues] = useState({});
  const [files, setFiles] = useState([]);

  const [Loading, setLoading] = useState(false);
  const { toast } = useToast();

  const closeOpenModal = () => {
    setOpenModal({
      Visible: false,
      InfoEditar: {},
    });
    setInputValues({});
  };
  const HandlerChange = (e) => {
    setInputValues({
      ...InputValues,
      [e.target.name]: e.target.value,
    });
  };

  const uploadImages = async (images, name) => {
    const urlLinks = await Promise.all(
      images.map(async (image, index) => {
        const imageRef = ref(
          storage,
          `Restaurantes/${name}/image-${index}.jpg`
        );
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        return url;
      })
    );
    return urlLinks;
  };
  const HandlerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (Object.keys(OpenModal?.InfoEditar).length > 0) {
        if (Object.keys(InputValues).length > 0) {
          const UpdateRef = doc(
            db,
            "Restaurantes",
            `${OpenModal?.InfoEditar?.id}`
          );

          // Set the "capital" field of the city 'DC'
          await updateDoc(UpdateRef, {
            ...InputValues,
          });
        }
        if (files?.length > 0) {
          // Borrar las imágenes antiguas
          const ImgRef = ref(
            storage,
            `Restaurantes/${OpenModal?.InfoEditar?.NombreLocal?.replace(
              /\s+/g,
              "_"
            )}/`
          );
          listAll(ImgRef)
            .then((res) => {
              res.items.forEach((itemRef) => {
                // Ahora debes borrar cada objeto (archivo)
                deleteObject(itemRef).catch((error) => {
                  // Maneja cualquier error
                  alert(` Error al eliminar ${itemRef.fullPath}`);
                  console.log(`Error al eliminar ${itemRef.fullPath}`, error);
                });
              });
            })
            .catch((error) => {
              // Maneja cualquier error
              console.error("Error al listar los objetos", error);
            });

          const NombreCarpeta =
            InputValues?.NombreLocal?.replace(/\s+/g, "_") ||
            OpenModal?.InfoEditar?.NombreLocal?.replace(/\s+/g, "_");

          // toca modificar la funcion y enviarle el values para que funcione mejor
          const ImagesUrl = await uploadImages(files, NombreCarpeta);

          const UpdateRef = doc(
            db,
            "Restaurantes",
            `${OpenModal?.InfoEditar?.id}`
          );
          await updateDoc(UpdateRef, {
            Imagenes: ImagesUrl,
          });
        }
        closeOpenModal();
      } else {
        if (!files?.length > 0) {
          toast({
            title: "Alerta",
            description: "Por favor seleccione una imágen para el restaurante",
          });

          return;
        }

        const NombreCarpeta = InputValues?.NombreLocal?.replace(/\s+/g, "_");

        const ImagesUrl = await uploadImages(files, NombreCarpeta); // Asegúrate de que la promesa se haya resuelto

        const docRef = await addDoc(collection(db, "Restaurantes"), {
          ...InputValues,
          Imagenes: ImagesUrl || [], // Ahora ImagesUrl es una matriz de cadenas de texto
          // add timestamp creat_at
          createdAt: serverTimestamp(),
        });

        closeOpenModal();
      }
    } catch (err) {
      console.error("Error:", err);
      toast({
        title: err?.error?.errorInfo?.code || "Internal Server Error",
        description: err?.error?.errorInfo?.message || "Contacte con soporte",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={OpenModal?.Visible} onOpenChange={closeOpenModal}>
      <DialogContent className="h-auto  w-[90%] md:w-full max-h-[95vh] overflow-auto   sm:max-w-4xl">
        <DialogHeader className="w-full h-full">
          <DialogTitle>
            {Object.keys(OpenModal?.InfoEditar).length > 0
              ? "Editar"
              : "Agregar"}{" "}
            un restaurante
          </DialogTitle>
          <DialogDescription>
            <form onSubmit={HandlerSubmit} className="space-y-4 w-full h-full">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="NombreLocal" className="">
                    Nombre del local <span className="text-red-600">(*)</span>
                  </Label>
                  <Input
                    id="NombreLocal"
                    name="NombreLocal"
                    className="w-full text-gray-900"
                    onChange={HandlerChange}
                    defaultValue={OpenModal?.InfoEditar?.NombreLocal}
                    required
                    autoComplete="off"
                    autoFocus
                    type="text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="RazonSocial" className="">
                    Razón Social <span className="text-red-600">(*)</span>
                  </Label>
                  <Input
                    id="RazonSocial"
                    name="RazonSocial"
                    className="w-full text-gray-900"
                    onChange={HandlerChange}
                    defaultValue={OpenModal?.InfoEditar?.RazonSocial}
                    required
                    autoComplete="off"
                    type="text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="Ruc" className="">
                    Ruc <span className="text-red-600">(*)</span>
                  </Label>
                  <Input
                    id="Ruc"
                    name="Ruc"
                    className="w-full text-gray-900"
                    onChange={HandlerChange}
                    defaultValue={OpenModal?.InfoEditar?.Ruc}
                    required
                    autoComplete="off"
                    type="text"
                    pattern=".{6,}"
                    title="6 caracteres mínimo"
                  />
                </div>

                <div>
                  <div>
                    <Label htmlFor="Imagenes">
                      Imagen Principal{" "}
                      <span className="text-red-600"> (*)</span>
                    </Label>
                    <FileUploader
                      setFiles={setFiles}
                      files={files}
                      Modal={OpenModal}
                    />
                  </div>
                </div>
              </div>

              <Button
                disabled={Loading}
                className="   disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
              >
                Guardar{" "}
              </Button>
            </form>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ModalRestaurantes;
